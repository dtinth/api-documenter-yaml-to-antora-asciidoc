#!/bin/bash -e

# Clear the project directory
rm -rf project
mkdir -p project/yaml

# Extract the YAML files
tar xvzf vue@3.2.9-sdp.tar.gz -C project/yaml

# Generate AsciiDoc files
(cd project && ../../bin/api-documenter-yaml-to-antora-asciidoc asciidoc -i yaml)

# Create Antora config
cat > project/docs/antora.yml <<EOF
name: vue3
version: master
title: vue3
nav:
  - modules/ROOT/nav.adoc
  - modules/api/nav.adoc
EOF

# Create Antora index page
mkdir -p project/docs/modules/ROOT/pages
cat > project/docs/modules/ROOT/pages/index.adoc <<EOF
= Example
EOF

# Create Antora navbar
cat > project/docs/modules/ROOT/nav.adoc <<EOF
* xref:index.adoc[]
EOF

# Create Git repository
(
  cd project
  git init .
  git config user.email "example@example.com"
  git config user.name "Example"
  git add -A
  git commit -m "Initial commit"
)

# Generate the website
pnpx antora generate antora-playbook.yml
