export type Detection="text"|"selector"|"url";
export type EventRule={enabled:boolean;detection:Detection;match:string};
export type TrackingConfig={
  lead:EventRule;
  addToCart:EventRule;
  initiateCheckout:EventRule;
  purchase:{mode:"gateway_approved"|"thank_you";valueSource:"sale"|"fixed";fixedValue:number;product:string;thankYouMatch:string};
  gateway:{forwardUtms:boolean;forwardFacebook:boolean;forwardVisitor:boolean};
  ipMode:"auto"|"ipv4"|"disabled";
};

export const defaultTrackingConfig:TrackingConfig={
  lead:{enabled:false,detection:"text",match:"ENVIAR"},
  addToCart:{enabled:false,detection:"text",match:"ADICIONAR AO CARRINHO"},
  initiateCheckout:{enabled:true,detection:"text",match:"COMPRAR AGORA"},
  purchase:{mode:"gateway_approved",valueSource:"sale",fixedValue:0,product:"any",thankYouMatch:"/obrigado"},
  gateway:{forwardUtms:true,forwardFacebook:true,forwardVisitor:true},
  ipMode:"auto"
};

const text=(value:unknown,fallback:string)=>String(value??fallback).trim().slice(0,240);
const bool=(value:unknown,fallback:boolean)=>typeof value==="boolean"?value:fallback;
function rule(value:unknown,fallback:EventRule):EventRule{const v=value&&typeof value==="object"?value as Record<string,unknown>:{};const detection=v.detection==="selector"||v.detection==="url"?v.detection:"text";return{enabled:bool(v.enabled,fallback.enabled),detection,match:text(v.match,fallback.match)}}
export function parseTrackingConfig(raw:unknown):TrackingConfig{
  let source:Record<string,unknown>={};try{source=typeof raw==="string"?JSON.parse(raw):raw&&typeof raw==="object"?raw as Record<string,unknown>:{}}catch{}
  const purchase=source.purchase&&typeof source.purchase==="object"?source.purchase as Record<string,unknown>:{},gateway=source.gateway&&typeof source.gateway==="object"?source.gateway as Record<string,unknown>:{};
  return{lead:rule(source.lead,defaultTrackingConfig.lead),addToCart:rule(source.addToCart,defaultTrackingConfig.addToCart),initiateCheckout:rule(source.initiateCheckout,defaultTrackingConfig.initiateCheckout),purchase:{mode:purchase.mode==="thank_you"?"thank_you":"gateway_approved",valueSource:purchase.valueSource==="fixed"?"fixed":"sale",fixedValue:Math.max(0,Number(purchase.fixedValue)||0),product:text(purchase.product,"any"),thankYouMatch:text(purchase.thankYouMatch,"/obrigado")},gateway:{forwardUtms:bool(gateway.forwardUtms,true),forwardFacebook:bool(gateway.forwardFacebook,true),forwardVisitor:bool(gateway.forwardVisitor,true)},ipMode:source.ipMode==="disabled"||source.ipMode==="ipv4"?source.ipMode:"auto"};
}
