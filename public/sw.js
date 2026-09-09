let soundPref={soundId:"cha-ching",enabled:true};
self.addEventListener("message",event=>{
 const d=(event.data||{});
 if(d.type==="set-sound")soundPref={soundId:(typeof d.soundId==="string"&&d.soundId)?d.soundId:"cha-ching",enabled:d.enabled!==false};
});
self.addEventListener("push",event=>{
 let data={};
 try{data=event.data?event.data.json():{};}catch{}
 const title=data.title||"TrackBase Analytics";
 const options={body:data.body||"Nova atualização nas suas vendas.",icon:"/icon-192.png",badge:"/icon-192.png",vibrate:[300,100,200,100,300],tag:data.tag||"trackbase-sale",renotify:true,data:{url:data.url||"/vendas"}};
 event.waitUntil((async()=>{
  const wins=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const w of wins){try{w.postMessage({type:"play-sale-sound",soundId:soundPref.soundId,enabled:soundPref.enabled});}catch{}}
  return self.registration.showNotification(title,options);
 })());
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=(event.notification.data&&event.notification.data.url)||"/vendas";
 event.waitUntil((async()=>{
  const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
  for(const w of wins){try{if(w.url&&new URL(w.url).pathname===url){await w.focus();return}}catch{}}
  for(const w of wins){try{await w.focus();await w.navigate(url);return}catch{}}
  if(clients.openWindow)return clients.openWindow(url);
 })());
});