// Robôs que abrem a página com as UTMs do anúncio e viravam "acesso"/"clique"
// falso: o crawler de prévia/revisão da Meta (facebookexternalhit, Facebot,
// meta-externalagent), buscadores, prévias de link, monitores e navegadores
// automatizados. O navegador interno do Facebook/Instagram (FBAN/FBAV,
// Instagram) é tráfego real e NÃO entra aqui.
export const BOT_UA_SOURCE =
  "facebookexternalhit|facebot|facebookcatalog|meta-externalagent|meta-externalfetcher|meta-webindexer" +
  "|[a-z]bot\\/|\\bbot\\b|crawler|spider|crawling|slurp|bingpreview|adsbot|mediapartners|google-inspectiontool|googleother" +
  "|headlesschrome|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|chrome-lighthouse|gtmetrix|pingdom|uptimerobot|statuscake" +
  "|whatsapp|telegrambot|twitterbot|linkedinbot|discordbot|slackbot|skypeuripreview|embedly|quora link preview" +
  "|python-requests|python-urllib|curl\\/|wget|axios\\/|node-fetch|go-http-client|okhttp|java\\/|libwww|httpclient";

const BOT_UA = new RegExp(BOT_UA_SOURCE, "i");

export function isBotUserAgent(userAgent: string | null | undefined) {
  const ua = (userAgent || "").trim();
  return !ua || BOT_UA.test(ua);
}
