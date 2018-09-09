<template>
<section class="extra-resource-preview">

</section>
</template>

<script>
import CodePanel from './code-panel.vue'

export default {
  props: {
    content: string,
    filename: string
  },
  computed: {
    isCode() {

    },

  },
  components: {
    CodePanel
  },
}
</script>

<style>
.extra-resource-preview {
  min-height: 400px;
  height: 100%;
}
</style>

