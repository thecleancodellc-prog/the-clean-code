const STOP = new Set((
  "a an the and or for to of in on with your you how why what guide tips ways best top simple easy " +
  "eco friendly non toxic sustainable sustainability green clean cleaner healthier healthy home homes living " +
  "natural safe safer choices alternatives alternative create creating make making build building beyond more less"
).split(/\s+/));

const stem = (word) => word.replace(/(ing|ies|es|s)$/, "");

export function topicWords(value) {
  return new Set((String(value || "").toLowerCase().match(/[a-z]+/g) || [])
    .filter((word) => word.length > 2 && !STOP.has(word))
    .map(stem));
}

function headings(html) {
  return [...String(html || "").matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi)].map((match) => match[1]).join(" ");
}

export function postTopicText(post) {
  return [
    post?.title,
    post?.slug?.replaceAll("-", " "),
    ...(post?.seo?.keywords || []),
    headings(post?.content),
  ].filter(Boolean).join(" ");
}

export function isTopicRepeat(candidate, post) {
  const candidateWords = topicWords(`${candidate?.title || candidate} ${candidate?.slug || ""}`);
  const existingWords = topicWords(postTopicText(post));
  if (!candidateWords.size || !existingWords.size) return false;
  const shared = [...candidateWords].filter((word) => existingWords.has(word));
  const containment = shared.length / Math.min(candidateWords.size, existingWords.size);
  return shared.length >= 2 && containment >= 0.5;
}
