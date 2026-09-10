export function stripCpf(value: unknown){
  return String(value||"").replace(/\D/g,"").slice(0,11);
}

export function formatCpf(value: unknown){
  const d=stripCpf(value);
  if(d.length<=3)return d;
  if(d.length<=6)return `${d.slice(0,3)}.${d.slice(3)}`;
  if(d.length<=9)return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export function validateCpf(value: unknown){
  const d=stripCpf(value);
  if(d.length!==11)return false;
  if(/^(\d)\1{10}$/.test(d))return false;
  let sum=0;
  for(let i=0;i<9;i++)sum+=Number(d[i])*(10-i);
  const dv1=sum%11<2?0:11-sum%11;
  if(Number(d[9])!==dv1)return false;
  sum=0;
  for(let i=0;i<10;i++)sum+=Number(d[i])*(11-i);
  const dv2=sum%11<2?0:11-sum%11;
  return Number(d[10])===dv2;
}
