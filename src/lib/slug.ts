/** URL segment for category hub routes — must match [slug] in category/[slug]. */
export function slugifyCategory(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}
