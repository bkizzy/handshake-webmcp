export function isUserActivatedSameOriginNavigation(headers: Headers) {
  return headers.get("sec-fetch-user") === "?1"
    && headers.get("sec-fetch-mode") === "navigate"
    && headers.get("sec-fetch-dest") === "document"
    && headers.get("sec-fetch-site") === "same-origin";
}
