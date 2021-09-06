import {
  PackageYamlModel,
  TypeYamlModel,
  EnumYamlModel,
  CommonYamlModel,
  FieldYamlModel,
  ISyntax,
} from '@microsoft/api-documenter/lib/yaml/ISDPYamlFile'

type FixedEnumYamlModel = EnumYamlModel & { type: 'enum' }
export type ToplevelItem = PackageYamlModel | TypeYamlModel | FixedEnumYamlModel
export type ToplevelItemType = ToplevelItem['type']
export type Item = CommonYamlModel | FieldYamlModel
export type Syntax = ISyntax

type PageMapping = Record<string, string | undefined>

export class Catalog {
  private _pageMapping: PageMapping
  constructor(public items: ToplevelItem[]) {
    const fixItem = (item: ToplevelItem) => {
      if (!item.type) {
        // Sometimes an item doesn’t have a type but the UID contains the type…
        const m = item.uid.match(/:(\w+)$/)
        if (m) {
          item.type = m[1] as any
        }
      }
      return item
    }

    this.items = items
      .slice()
      .map(fixItem)
      .sort((a, b) => a.uid.localeCompare(b.uid))

    // Generate page mapping by traversing the object.
    this._pageMapping = this._generatePageMapping(this.items)
  }

  private _generatePageMapping(items: ToplevelItem[]): PageMapping {
    const mapping: PageMapping = {}
    const traverse = (item: unknown, pageUid: string) => {
      if (item instanceof Array) {
        item.forEach((child) => traverse(child, pageUid))
      } else if (item instanceof Object) {
        if (hasUid(item)) {
          mapping[item.uid] = pageUid
        }
        Object.values(item).forEach((child) => traverse(child, pageUid))
      }
    }
    for (const item of items) {
      traverse(item, item.uid)
    }
    return mapping
  }

  get uids() {
    return Object.keys(this._pageMapping)
  }

  get(uid: string) {
    return this.items.find((item) => item.uid === uid)
  }

  getPage(uid: string) {
    return this._pageMapping[uid]
  }
}

function hasUid(item: any): item is { uid: string } {
  return typeof item.uid === 'string'
}
