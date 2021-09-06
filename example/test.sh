#!/bin/bash -e

rm -rf images
mkdir -p images

generate() {
  pnpx playwright screenshot --viewport-size="1280,720" "file://$PWD/$1" images/$2.png
}

generate "build/site/vue3-apidocs-example/api/vue_reactivity.html" reactivity
generate "build/site/vue3-apidocs-example/api/vue_reactivity.html#vue_reactivity_shallowReactive_function_1" shallow_reactive
generate "build/site/vue3-apidocs-example/api/vue_shared_PatchFlags_enum.html" patchflags