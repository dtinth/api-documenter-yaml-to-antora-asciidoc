import 'make-promises-safe'

import { CLI } from './CLI'

function main() {
  const cli = new CLI()
  cli.execute()
}

main()
