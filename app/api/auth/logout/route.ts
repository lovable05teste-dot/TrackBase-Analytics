export async function GET(request:Request){
 const secure=process.env.SECURE_COOKIES==="true"||(!process.env.SECURE_COOKIES&&process.env.NODE_ENV==="production")?" Secure;":"";
 return new Response(null,{status:302,headers:{location:new URL("/login",request.url).toString(),"set-cookie":`tb_session=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`}});
}
