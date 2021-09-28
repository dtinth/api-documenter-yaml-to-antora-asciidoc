import { Catalog, Item, Syntax, ToplevelItem } from './Catalog'
import fs from 'fs'
import path from 'path'
import glob from 'glob'
import yaml from 'js-yaml'
import mkdirp from 'mkdirp'
import { SlugMapping } from './SlugMapping'

/**
 * Generates Antora-AsciiDoc documentation from a folder of YAML files.
 */
export class AsciiDocDocumentationGenerator {
  public constructor(
    private readonly _inputFolder: string,
    private readonly _outputFolder: string,
  ) {}

  public async generate(): Promise<void> {
    const catalog = new Catalog(this._loadItems())
    const slugMapping = new SlugMapping(catalog.uids)

    // Generate an AsciiDoc page for each item.
    for (const item of catalog.items) {
      const outputFile = path.join(
        this._outputFolder,
        'docs/modules/api/pages',
        slugMapping.getSlug(item.uid) + '.adoc',
      )
      const outputDir = path.dirname(outputFile)
      mkdirp.sync(outputDir)
      fs.writeFileSync(
        outputFile,
        new AsciiDocGenerator(item, catalog, slugMapping).toString(),
      )
      console.log(`Generated ${outputFile}`)
    }

    {
      const outputFile = path.join(
        this._outputFolder,
        'docs/modules/api/nav.adoc',
      )
      fs.writeFileSync(
        outputFile,
        new NavigationFile(catalog, slugMapping).toString(),
      )
      console.log(`Generated ${outputFile}`)
    }
  }

  private _loadItems(): ToplevelItem[] {
    const items: ToplevelItem[] = []
    const files = glob.sync('**/*.yml', { cwd: this._inputFolder })
    for (const file of files) {
      const content = fs.readFileSync(
        path.join(this._inputFolder, file),
        'utf8',
      )
      const itemsInThisFile = yaml.loadAll(content) as any[]
      for (const item of itemsInThisFile) {
        if (item.uid) {
          items.push(item)
        }
      }
    }
    return items
  }
}

/**
 * Generates a single AsciiDoc page for a single item.
 */
class AsciiDocGenerator {
  private _output: string[] = []

  constructor(
    private _item: ToplevelItem,
    private _catalog: Catalog,
    private _slugMapping: SlugMapping,
  ) {
    this._generate()
  }

  _generate() {
    const { type, name, summary } = this._item
    const remarks = 'remarks' in this._item ? this._item.remarks : ''
    this._output.push(`= ${type} ${name}`)
    this._output.push('')
    this._output.push(this._formatMarkdownString(summary ?? ''))
    this._output.push('')
    this._output.push(this._formatMarkdownString(remarks ?? ''))
    this._output.push('')
    if (type === 'package' || type === 'enum') {
      this._generateModuleOrEnum()
    } else if (type === 'class' || type === 'interface') {
      this._generateClassOrInterface()
    }
  }

  _generateModuleOrEnum() {
    const item = this._item
    if ('fields' in item) {
      this._generateListing('== Fields', item.fields, (fields) => {
        for (const f of fields) {
          this._generateMember(f)
        }
      })
    }
    if ('classes' in item) {
      this._generateSummaryListing('== Classes', item.classes)
    }
    if ('interfaces' in item) {
      this._generateSummaryListing('== Interfaces', item.interfaces)
    }
    if ('enums' in item) {
      this._generateSummaryListing('== Enumerations', item.enums)
    }
    if ('functions' in item) {
      this._generateListing('== Functions', item.functions, (functions) => {
        for (const f of functions) {
          this._generateMember(f)
        }
      })
    }
  }

  _generateMember(member: Item) {
    const { name, summary, uid } = member
    const remarks = 'remarks' in member ? member.remarks : ''
    this._output.push(`[id="${this._slugMapping.getSlug(uid)}"]`)
    this._output.push(`=== ${name}`)
    this._output.push('')
    this._output.push('========')
    this._output.push('')
    this._output.push(this._formatMarkdownString(summary ?? ''))
    this._output.push('')
    this._output.push(this._formatMarkdownString(remarks ?? ''))
    this._output.push('')
    if ('syntax' in member && member.syntax) {
      this._generateSyntax(member.syntax)
    } else if ('value' in member) {
      this._output.push('')
      this._output.push('.Declaration')
      this._output.push('[source,typescript]')
      this._output.push('----')
      this._output.push(name + ' = ' + member.value)
      this._output.push('----')
    }
    this._output.push('')
    this._output.push('========')
  }

  _generateClassOrInterface() {
    const item = this._item
    if ('properties' in item) {
      this._generateListing('== Properties', item.properties, (array) => {
        for (const property of array) {
          this._generateMember(property)
        }
      })
    }
    if ('constructors' in item) {
      this._generateListing('== Constructors', item.constructors, (array) => {
        for (const constructor of array) {
          this._generateMember(constructor)
        }
      })
    }
    if ('methods' in item) {
      this._generateListing('== Methods', item.methods, (array) => {
        for (const method of array) {
          this._generateMember(method)
        }
      })
    }
  }

  _generateSummaryListing(title: string, items: string[] | undefined) {
    this._generateListing(title, items, (array) => {
      this._output.push(`[%header,cols="1,2",caption=""]`)
      this._output.push('|===')
      this._output.push('|Name |Summary')
      for (const uid of array) {
        const item = this._catalog.get(uid)
        if (item) {
          const slug = this._slugMapping.getSlug(uid)
          this._output.push(``)
          this._output.push(`s|xref:${slug}.adoc[${item.name}]`)
          this._output.push(
            `|${this._formatMarkdownString(item.summary || '')}`,
          )
        }
      }
      this._output.push('|===')
    })
  }

  _generateListing<T>(
    title: string,
    items: T[] | undefined,
    callback: (array: T[]) => void,
  ) {
    if (!items || !items.length) {
      return
    }
    this._output.push(`${title}`)
    this._output.push('')
    callback(items)
    this._output.push('')
  }

  _generateSyntax(syntax: Syntax) {
    const { content, parameters, return: returnValue } = syntax
    if (parameters && parameters.length) {
      this._output.push('.Parameters')
      const footer = returnValue ? `%footer` : ``
      this._output.push(`[%header${footer},cols="2,3,4",caption=""]`)
      this._output.push('|===')
      this._output.push('|Name |Type |Description')
      for (const parameter of parameters) {
        const { id, type, description } = parameter
        this._output.push(``)
        this._output.push(`m|${id}`)
        this._output.push(`m|${this._formatTypeString(type as string)}`)
        this._output.push(`|${this._formatMarkdownString(description || '')}`)
      }
      if (returnValue) {
        const { type, description } = returnValue
        this._output.push(``)
        this._output.push(`s|Returns`)
        this._output.push(`m|${this._formatTypeString(type as string)}`)
        this._output.push(`|${this._formatMarkdownString(description || '')}`)
      }
      this._output.push('|===')
    }
    if (content) {
      this._output.push('')
      this._output.push('.Signature')
      this._output.push('[source,typescript]')
      this._output.push('----')
      this._output.push(content)
      this._output.push('----')
    }
  }

  _resolveXref(uid: string) {
    const getFallback = () => {
      const m = uid.match(/!([^!:]+):/)
      return m ? m[1] : uid
    }

    const pageUid = this._catalog.getPage(uid)
    if (!pageUid) {
      return getFallback()
    }

    const pageSlug = this._slugMapping.getSlug(pageUid)
    const itemSlug = this._slugMapping.getSlug(uid)

    const item = this._catalog.get(uid)
    const page = this._catalog.get(pageUid)
    if (!page) {
      return getFallback()
    }

    const name = item?.name || getFallback()

    if (pageUid === uid) {
      return `xref:${pageSlug}.adoc[${name}]`
    } else {
      return `xref:${pageSlug}.adoc#${itemSlug}[${name}]`
    }
  }

  _formatTypeString(text: string) {
    return text
      .replace(/[|~]/, '\\$&')
      .replace(/<xref uid="([^"]+)"\s*\/>/g, (match, uid) => {
        return this._resolveXref(uid)
      })
  }

  _formatMarkdownString(text: string) {
    return text
      .replace(
        /\[([^\]]+)\]\(((?:[^\s()]|[(][^)]*[)])*)\)/g,
        (match, name, href) => {
          if (href.startsWith('xref:')) {
            const uid = href.substring(5)
            return this._resolveXref(decodeURIComponent(uid))
          } else {
            return `${href}[${name}]`
          }
        },
      )
      .replace(/<!-- -->/g, '')
  }

  toString() {
    return this._output.join('\n')
  }
}

/**
 * Generate an Antora navigation file.
 */
class NavigationFile {
  private _parentMap: Record<string, string | undefined> = {}

  constructor(private _catalog: Catalog, private _slugMapping: SlugMapping) {
    this._parentMap = {}
    for (const item of this._catalog.items) {
      if (item.package) {
        this._parentMap[item.uid] = item.package
      }
    }
  }

  toString() {
    const output = []
    output.push('.API documentation')
    const traverse = (depth: number, parentUid: string | undefined) => {
      const items = this._itemsByParent(parentUid)
      for (const item of items) {
        const slug = this._slugMapping.getSlug(item.uid)
        output.push(`${'*'.repeat(depth)} xref:${slug}.adoc[${item.name}]`)
        traverse(depth + 1, item.uid)
      }
    }
    traverse(1, undefined)
    return output.join('\n')
  }

  _itemsByParent(parentUid: string | undefined) {
    return this._catalog.items.filter((item) => {
      return this._parentMap[item.uid] === parentUid
    })
  }
}
