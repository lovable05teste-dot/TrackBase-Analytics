import {MetaApiError} from "./meta";

// Only an asset access error can justify trying the existing assignment flow.
// An expired token, rate limit or outage is never evidence of a missing share.
export function canAssignPartnerAccount(error:unknown){
 return error instanceof MetaApiError&&!error.transient&&error.status<500&&error.status!==429&&(error.code===10||error.code!==undefined&&error.code>=200&&error.code<300||error.code===803||error.code===100&&error.subcode===33);
}
export function partnerFailure(error:unknown,adAccountId:string,businessId:string,stage:"read"|"assignment"){
 const meta=error instanceof MetaApiError?error:null;
 const diagnostic={...(meta?.code!==undefined?{metaCode:meta.code}:{}),...(meta?.subcode!==undefined?{metaSubcode:meta.subcode}:{}),stage};
 if(meta?.code===190||meta?.code===102)return {status:503,body:{code:"PARTNER_TOKEN_INVALID",error:"O token da conexão por parceiro está inválido ou expirou. O administrador da GhostScale precisa renovar essa conexão. Compartilhar a conta novamente não corrige esse erro.",...diagnostic}};
 if(meta?.status===429||[4,17,613].includes(meta?.code??-1))return {status:429,body:{code:"META_RATE_LIMIT",error:"A Meta limitou temporariamente as consultas. Aguarde alguns minutos e tente novamente.",retryable:true,...diagnostic}};
 if(meta?.transient||!meta||meta.status>=500)return {status:503,body:{code:"META_TEMPORARY_UNAVAILABLE",error:"Não foi possível consultar a Meta agora. Isso não confirma falta de compartilhamento. Tente novamente em alguns minutos.",retryable:true,...diagnostic}};
 if(canAssignPartnerAccount(error))return {status:403,body:{code:stage==="assignment"?"PARTNER_ASSIGNMENT_REQUIRED":"PARTNER_ACCOUNT_ACCESS_REQUIRED",error:`Não foi possível confirmar o acesso à conta ${adAccountId}. Confira o compartilhamento com o portfólio ${businessId} e a atribuição dessa conta ao usuário do sistema que gerou o token da GhostScale. Se já compartilhou, confira a atribuição do usuário do sistema.`,...diagnostic}};
 return {status:503,body:{code:"PARTNER_CONNECTION_FAILED",error:"A Meta recusou a consulta da conta. Confira o diagnóstico e a configuração da conexão por parceiro; não é possível concluir que a conta não foi compartilhada.",...diagnostic}};
}
