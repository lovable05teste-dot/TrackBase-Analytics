export async function GET(request:Request){
 return new Response(null,{status:302,headers:{location:new URL("/login",request.url).toString(),"set-cookie":"tb_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}});
}
