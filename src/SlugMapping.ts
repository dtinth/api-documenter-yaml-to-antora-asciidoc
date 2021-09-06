export class SlugMapping {
  uidToSlugMap: Record<string, string> = {}

  constructor(uids: string[]) {
    uids.forEach((uid) => {
      this.getSlug(uid)
    })
  }

  getSlug(uid: string) {
    if (this.uidToSlugMap[uid]) {
      return this.uidToSlugMap[uid]
    }
    const slug = uid
      .replace(/[^a-z0-9_-]+/gi, ' ')
      .trim()
      .replace(/\s+/g, '_')
    this.uidToSlugMap[uid] = slug
    return slug
  }
}
