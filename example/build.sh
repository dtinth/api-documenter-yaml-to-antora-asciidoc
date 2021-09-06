#!/bin/bash -e

rm -rf project
mkdir -p project/yaml
tar xvzf vue@3.2.9-sdp.tar.gz -C project/yaml
(cd project && git init . && ../../bin/api-documenter-yaml-to-antora-asciidoc asciidoc -i yaml)
cat > project/docs/antora.yml <<EOF
name: vue3
version: master
title: vue3
nav:
  - modules/ROOT/nav.adoc
  - modules/api/nav.adoc
EOF
mkdir -p project/docs/modules/ROOT/pages
cat > project/docs/modules/ROOT/nav.adoc <<EOF
* xref:index.adoc[]
EOF
cat > project/docs/modules/ROOT/pages/index.adoc <<EOF
= Example
EOF
(cd project && git add -A && git commit -m "Initial commit")
pnpx antora generate antora-playbook.yml
