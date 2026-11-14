#!/usr/bin/env python3
"""六花日语 增量打包：在已发布的 APK 上替换网页文件和 classes.dex，生成「未签名、已对齐」的 APK。

不改清单结构：只原位改 versionCode（整数值）和 versionName（同长度字符串）；
其余条目（resources.arsc、lib/*.so、classes2.dex、资源）原样拷贝，压缩方式不变。
对齐：不压缩的条目 4 字节对齐，lib/*.so 按 16 KB 页对齐（与 zipalign -P 16 相同）。
签名必须用同一个 rikka.p12（v1+v2+v3），本脚本不碰密钥：
    apksigner sign --ks rikka.p12 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out 签名后.apk 未签名.apk

用法：python3 repack.py 基础.apk 输出.apk --web 网页目录 [--file 名称 ...] [--dex classes.dex] --code 119 --name 3.2.3
"""
import argparse, os, struct, zipfile

def patch_manifest(data, code, name):
    d = bytearray(data)
    m = re_find_manifest_attrs(d)
    old_code, code_at = m['code']
    if code is not None:
        struct.pack_into('<I', d, code_at, code)
    if name is not None:
        old = m['name'].encode('utf-16-le'); new = name.encode('utf-16-le')
        if len(old) != len(new):
            raise SystemExit('versionName 必须与原来等长（%s → %s），否则要重建字符串池' % (m['name'], name))
        i = d.find(struct.pack('<H', len(m['name'])) + old)
        if i < 0 or d.find(struct.pack('<H', len(m['name'])) + old, i + 1) >= 0:
            raise SystemExit('versionName 字符串在清单里不唯一')
        d[i + 2:i + 2 + len(old)] = new
    return bytes(d), old_code, m['name']

def re_find_manifest_attrs(d):
    """解析二进制 XML：取字符串池，找 <manifest> 的 versionCode / versionName 属性。"""
    assert struct.unpack_from('<HHI', d, 0)[0] == 3
    sp = 8
    t, hs, size, count, _, flags, s_start, _ = struct.unpack_from('<HHIIIIII', d, sp)
    assert t == 1
    utf8 = flags & 0x100
    offs = struct.unpack_from('<%dI' % count, d, sp + hs)
    def s(i):
        o = sp + s_start + offs[i]
        if utf8:
            n = d[o] & 0x7f if d[o] < 0x80 else ((d[o] & 0x7f) << 8 | d[o + 1]); o += 2 if d[o] >= 0x80 else 1
            n = d[o] if d[o] < 0x80 else ((d[o] & 0x7f) << 8 | d[o + 1]); o += 2 if d[o] >= 0x80 else 1
            return bytes(d[o:o + n]).decode('utf-8')
        n = struct.unpack_from('<H', d, o)[0]
        return bytes(d[o + 2:o + 2 + n * 2]).decode('utf-16-le')
    p = sp + size
    while p < len(d):
        t, hs, size = struct.unpack_from('<HHI', d, p)
        if t == 0x0180:  # 资源 id 表
            ids = struct.unpack_from('<%dI' % ((size - 8) // 4), d, p + 8)
        if t == 0x0102:  # START_TAG
            name = s(struct.unpack_from('<I', d, p + 20)[0])
            if name == 'manifest':
                a_start, a_size, a_count = struct.unpack_from('<HHH', d, p + 24)
                out = {}
                for k in range(a_count):
                    a = p + 16 + a_start + k * a_size
                    ns, nm, raw, _, _, typ, val = struct.unpack_from('<IIIHBBI', d, a)
                    rid = ids[nm] if nm < len(ids) else 0
                    if rid == 0x0101021b:   # versionCode
                        out['code'] = (val, a + 16)
                    if rid == 0x0101021c:   # versionName
                        out['name'] = s(raw if raw != 0xffffffff else val)
                return out
        p += size
    raise SystemExit('清单里没找到 <manifest>')

def build(base, out, files, code, name):
    zin = zipfile.ZipFile(base)
    zout = open(out, 'wb')
    central = []
    names = [i.filename for i in zin.infolist()]
    extra_new = [k for k in files if k not in names]
    entries = [i for i in zin.infolist() if not i.filename.startswith('META-INF/')]
    for i in entries + [None] * len(extra_new):
        if i is None:
            fn = extra_new.pop(0); method = zipfile.ZIP_DEFLATED; data = files[fn]
        else:
            fn = i.filename; method = i.compress_type
            data = files.get(fn)
            if data is None:
                data = zin.read(fn)
                if fn == 'AndroidManifest.xml':
                    data, oc, on = patch_manifest(data, code, name)
                    print('清单：versionCode %d → %s，versionName %s → %s' % (oc, code, on, name))
        crc = zipfile.crc32(data) & 0xffffffff
        if method == zipfile.ZIP_STORED:
            comp = data
        else:
            import zlib
            c = zlib.compressobj(9, zlib.DEFLATED, -15); comp = c.compress(data) + c.flush()
        fnb = fn.encode('utf-8')
        off = zout.tell()
        extra = b''
        if method == zipfile.ZIP_STORED:
            align = 16384 if fn.endswith('.so') else 4
            data_at = off + 30 + len(fnb)
            pad = (-data_at) % align
            if pad:
                while pad < 6: pad += align
                # 0xd935 = zipalign / apksigner 用的对齐扩展字段：id、长度、对齐值，其余补 0
                extra = struct.pack('<HHH', 0xd935, pad - 4, align) + b'\0' * (pad - 6)
        hdr = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20 if method == zipfile.ZIP_STORED else 20, 0x0800 if any(ord(ch) > 127 for ch in fn) else 0,
                          method, 0, 0x21, crc, len(comp), len(data), len(fnb), len(extra))
        zout.write(hdr + fnb + extra + comp)
        central.append((fnb, method, crc, len(comp), len(data), off, 0x0800 if any(ord(ch) > 127 for ch in fn) else 0))
    cd = zout.tell()
    for fnb, method, crc, cs, us, off, fl in central:
        zout.write(struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, fl, method, 0, 0x21, crc, cs, us, len(fnb), 0, 0, 0, 0, 0, off) + fnb)
    end = zout.tell()
    zout.write(struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(central), len(central), end - cd, cd, 0))
    zout.close()

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('base'); ap.add_argument('out')
    ap.add_argument('--web'); ap.add_argument('--file', nargs='*', default=[])
    ap.add_argument('--dex'); ap.add_argument('--code', type=int); ap.add_argument('--name')
    a = ap.parse_args()
    files = {}
    for f in a.file:
        files['assets/' + f] = open(os.path.join(a.web, f), 'rb').read()
    if a.dex:
        files['classes.dex'] = open(a.dex, 'rb').read()
    build(a.base, a.out, files, a.code, a.name)
    print('写出', a.out, os.path.getsize(a.out), '字节（未签名）')
