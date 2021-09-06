import 'make-promises-safe'

import { CLI } from './CLI'

function main() {
  const cli = new CLI()
  void cli.execute()
}

main()
