window.HanaStore=(()=>{
  let promise;
  function open(){return promise||(promise=new Promise((resolve,reject)=>{const r=indexedDB.open('hanayomi',1);r.onupgradeneeded=()=>{for(const n of ['documents','words','meta'])r.result.createObjectStore(n,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('无法打开本地书架，请检查可用存储空间'));}));}
  async function action(store,method,arg){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,method==='get'||method==='getAll'?'readonly':'readwrite');const r=tx.objectStore(store)[method](arg);let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('本地保存失败'));tx.onabort=()=>reject(tx.error||new Error('保存被中止'));});}
  async function restore(data){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['documents','words','meta'],'readwrite');for(const name of ['documents','words','meta'])for(const item of data[name]||[])tx.objectStore(name).put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function removeMany(store,ids){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');for(const id of ids)tx.objectStore(store).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  return {removeMany,get:(s,k)=>action(s,'get',k),all:s=>action(s,'getAll'),put:(s,v)=>action(s,'put',v),remove:(s,k)=>action(s,'delete',k),restore};
})();
