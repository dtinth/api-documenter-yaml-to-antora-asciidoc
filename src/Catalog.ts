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

export class Catalog {
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
  }

  get uids() {
    return this.items.map((item) => item.uid)
  }

  get(uid: string) {
    return this.items.find((item) => item.uid === uid)
  }
}
