#!/usr/bin/env python3
"""六花日语 v2.4.0 构建：v2.3.9 assets + 注音主动审计修复 + 纯Python打包签名."""
import struct, zlib, base64, hashlib, os, sys, shutil

BASE_APK = '/home/hatch/workspace/goals/app-optimization/files/rikka-v1.4.5.apk'
NEW_ASSETS = '/home/hatch/workspace/build/v240/assets'
KEY_PEM = '/home/hatch/workspace/keystore/rikka.key.pem'
CERT_PEM = '/home/hatch/workspace/keystore/rikka.cert.pem'
OUT = '/home/hatch/workspace/your_files/rikka-v2.4.0.apk'
STAGE = '/home/hatch/workspace/build/v240/stage'
VER_CODE = 67
VER_NAME = '2.4.0'
NEW_PKG = 'cn.rikka.v2'
OLD_PKG = 'cn.rikka.app'

# ---------- 1. 解包 ----------
if os.path.exists(STAGE): shutil.rmtree(STAGE)
os.makedirs(STAGE)
import zipfile
with zipfile.ZipFile(BASE_APK) as z:
    for n in z.namelist():
        if n.startswith('META-INF/'): continue
        z.extract(n, STAGE)
# 替换 assets
shutil.rmtree(os.path.join(STAGE, 'assets'))
shutil.copytree(NEW_ASSETS, os.path.join(STAGE, 'assets'))
print('assets 替换完成')

# ---------- 2. Manifest 补丁 ----------
def patch_manifest(path):
    data = bytearray(open(path, 'rb').read())
    sp = 8
    sc = struct.unpack('<I', data[sp+8:sp+12])[0]
    ss = struct.unpack('<I', data[sp+20:sp+24])[0]
    offs = list(struct.unpack('<%dI' % sc, data[sp+28:sp+28+4*sc]))
    base = sp + ss
    def gs(i):
        o = base + offs[i]; ln = struct.unpack('<H', data[o:o+2])[0]
        return data[o+2:o+2+ln*2].decode('utf-16le')
    strs = [gs(i) for i in range(sc)]
    new_strs = list(strs)
    # versionName 等长替换
    for i, s in enumerate(new_strs):
        if s and s[0].isdigit() and s.count('.') == 2 and len(s) == len(VER_NAME):
            print('versionName: %s -> %s' % (s, VER_NAME)); new_strs[i] = VER_NAME; break
    # 包名
    pi = new_strs.index(OLD_PKG); new_strs[pi] = NEW_PKG
    print('package: %s -> %s' % (OLD_PKG, NEW_PKG))
    # 重建字符串池
    ctype, hsize, csize = struct.unpack('<HHI', data[sp:sp+8])
    stc, flags, stringsStart, stylesStart = struct.unpack('<IIII', data[sp+12:sp+28])
    out = bytearray(); new_offs = []
    for s in new_strs:
        new_offs.append(len(out))
        enc = s.encode('utf-16le')
        out += struct.pack('<H', len(s)) + enc + b'\x00\x00'
    new_pool = bytearray()
    new_pool += struct.pack('<HHI', 0x0001, 28, 0)
    new_pool += struct.pack('<IIIII', sc, stc, flags, stringsStart, stylesStart)
    new_pool += struct.pack('<%dI' % sc, *new_offs)
    new_pool += out
    struct.pack_into('<I', new_pool, 4, len(new_pool))
    data = bytearray(data[:sp]) + new_pool + data[sp+csize:]
    struct.pack_into('<I', data, 4, len(data))
    # versionCode
    base2 = sp + stringsStart
    def gs2(i):
        o = base2 + new_offs[i]; ln = struct.unpack('<H', data[o:o+2])[0]
        return data[o+2:o+2+ln*2].decode('utf-16le')
    p = 8
    while p + 8 <= len(data):
        ctype, hsize, csize = struct.unpack('<HHI', data[p:p+8])
        if csize < 8 or p + csize > len(data): break
        if ctype == 0x0102 and gs2(struct.unpack('<i', data[p+20:p+24])[0]) == 'manifest':
            astart, asize, acount = struct.unpack('<HHH', data[p+24:p+30])
            for a in range(acount):
                ap = p + astart + a*asize
                if gs2(struct.unpack('<i', data[ap:ap+4])[0]) == 'versionCode':
                    cur = struct.unpack('<i', data[ap+12:ap+16])[0]
                    struct.pack_into('<i', data, ap+12, VER_CODE)
                    print('versionCode: %d -> %d' % (cur, VER_CODE))
            break
        p += csize
    open(path, 'wb').write(data)

patch_manifest(os.path.join(STAGE, 'AndroidManifest.xml'))

# ---------- 3. 打包（手动 zip，STORED 对齐） ----------
def collect(root):
    files = []
    for dp, dn, fn in os.walk(root):
        dn.sort()
        for f in sorted(fn):
            fp = os.path.join(dp, f)
            rel = os.path.relpath(fp, root).replace(os.sep, '/')
            files.append((rel, open(fp, 'rb').read()))
    return files

entries = collect(STAGE)
# resources.arsc 必须 STORED；其他压缩
order = []
seen = set()
for rel, data in entries:
    if rel == 'resources.arsc':
        order.append((rel, data, False)); seen.add(rel)
for rel, data in entries:
    if rel not in seen:
        order.append((rel, data, True))

out = bytearray(); central = bytearray()
for rel, data, comp in order:
    nb = rel.encode('utf-8')
    if comp:
        co = zlib.compressobj(9, zlib.DEFLATED, -15)
        cdata = co.compress(data) + co.flush(); method = 8
    else:
        cdata = data; method = 0
    crc = zlib.crc32(data) & 0xffffffff
    # STORED 文件数据 4 字节对齐
    pad = (-(len(out) + 30 + len(nb))) % 4 if method == 0 else 0
    extra = bytes(pad)
    lho = len(out)
    out += struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, method, 0, 0,
                       crc, len(cdata), len(data), len(nb), len(extra))
    out += nb + extra + cdata
    central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, method, 0, 0,
                           crc, len(cdata), len(data), len(nb), len(extra), 0, 0, 0, 0, lho)
    central += nb + extra
cd_off = len(out); out += central
cd_len = len(out) - cd_off
out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(order), len(order), cd_len, cd_off, 0)

# ---------- 4. v1 签名 ----------
# (cryptography 仅用于加载 key/cert 对象，实际签名走 openssl CLI，此处不需要)
import subprocess, tempfile

def line(s):
    return s.encode('utf-8') + b'\r\n'

mf = b'Manifest-Version: 1.0\r\nCreated-By: Rikka Build\r\n\r\n'
sections = []
for rel, data, comp in order:
    sec = line('Name: ' + rel) + b'SHA-256-Digest: ' + base64.b64encode(hashlib.sha256(data).digest()) + b'\r\n\r\n'
    sections.append((rel, sec))
    mf += sec
sf = b'Signature-Version: 1.0\r\nCreated-By: Rikka Build\r\n'
sf += b'SHA-256-Digest-Manifest: ' + base64.b64encode(hashlib.sha256(mf).digest()) + b'\r\n\r\n'
for rel, sec in sections:
    sf += line('Name: ' + rel) + b'SHA-256-Digest: ' + base64.b64encode(hashlib.sha256(sec).digest()) + b'\r\n\r\n'
# 用 openssl 生成 PKCS7（-noattr：去掉 Android 不认的 SMIMECapability 属性）
with tempfile.NamedTemporaryFile(delete=False) as f:
    f.write(sf); sf_path = f.name
rsa_path = sf_path + '.rsa'
subprocess.run(['openssl','cms','-sign','-in',sf_path,'-inkey',KEY_PEM,'-signer',CERT_PEM,
                '-outform','DER','-noattr','-binary','-out',rsa_path],
               check=True, capture_output=True)
rsa = open(rsa_path,'rb').read()
os.unlink(sf_path); os.unlink(rsa_path)

metas = [('MANIFEST.MF', mf), ('CERT.SF', sf), ('CERT.RSA', rsa)]
# 重建：把 META-INF 加进 central（local 已在 out 尾部，需重排）
# 简化：重新生成整个 zip（含 META-INF 在 order 末尾）
order2 = order + [('META-INF/' + n, d, True) for n, d in metas]
out = bytearray(); central = bytearray()
for rel, data, comp in order2:
    nb = rel.encode('utf-8')
    if comp:
        co = zlib.compressobj(9, zlib.DEFLATED, -15)
        cdata = co.compress(data) + co.flush(); method = 8
    else:
        cdata = data; method = 0
    crc = zlib.crc32(data) & 0xffffffff
    pad = (-(len(out) + 30 + len(nb))) % 4 if method == 0 else 0
    extra = bytes(pad)
    lho = len(out)
    out += struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, method, 0, 0,
                       crc, len(cdata), len(data), len(nb), len(extra))
    out += nb + extra + cdata
    central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, method, 0, 0,
                           crc, len(cdata), len(data), len(nb), len(extra), 0, 0, 0, 0, lho)
    central += nb + extra
cd_off = len(out); out += central
cd_len = len(out) - cd_off
out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(order2), len(order2), cd_len, cd_off, 0)

open(OUT, 'wb').write(out)
print('APK 写入: %s (%.1f MB)' % (OUT, len(out)/1048576))

# ---------- 5. 验证 ----------
with zipfile.ZipFile(OUT) as z:
    bad = z.testzip()
    print('zip 完整性:', 'OK' if bad is None else 'BAD:' + str(bad))
    info = z.getinfo('resources.arsc')
    print('resources.arsc:', 'STORED' if info.compress_type == 0 else 'DEFLATED')
    names = z.namelist()
    print('文件数:', len(names), '| META-INF:', [n for n in names if n.startswith('META-INF/')])
# 验证签名摘要
with zipfile.ZipFile(OUT) as z:
    mf2 = z.read('META-INF/MANIFEST.MF')
    sf2 = z.read('META-INF/CERT.SF')
    ok = True
    for rel, data, comp in order:
        nb = rel.encode('utf-8')
        # 在 mf2 中找该文件的 section 并校验摘要
        marker = b'Name: ' + nb + b'\r\n'
        i = mf2.find(marker)
        if i < 0: print('缺失:', rel); ok = False; continue
        j = mf2.find(b'\r\n\r\n', i)
        sec = mf2[i:j+4]
        # 提取摘要行（可能换行，简化：找 SHA-256-Digest: 后连续的 base64）
        import re
        m = re.search(rb'SHA-256-Digest: ([A-Za-z0-9+/= ]+)', sec.replace(b'\r\n ', b''))
        if not m or base64.b64decode(m.group(1).replace(b' ', b'')) != hashlib.sha256(data).digest():
            print('摘要不匹配:', rel); ok = False
    print('签名摘要验证:', 'OK' if ok else 'FAIL')
print('DONE')
