<template>
  <section class="resource-content-main">
    <main>
      <el-row>
        <el-col :span="6" :offset="4">
          <el-button type="primary" :disabled="buttonDisabled" @click="download" :loading="loading" >download</el-button>
        </el-col>
      </el-row>
      <el-form  label-width="80px">
        <el-form-item label="pretier">
          <el-switch v-model="prettierFlag"></el-switch>
        </el-form-item>
        <el-form-item>
           <el-row>
             <el-col :span="6">
              <el-tree ref="tree" :data="nodeData" show-checkbox>
                <span class="custom-tree-node" slot-scope="{node, data}">
                  <span :class="getIcon(node, data)"></span>
                  <span>{{node.label}}</span>
                </span>
              </el-tree>
             </el-col>
             <el-col :span="18"></el-col>
           </el-row>
        </el-form-item>
      </el-form>
    </main>
  </section>
</template>

<script>
import { debounce, prettierScript } from './util/helper'
import JSZip from 'jszip'
import { saveAs } from 'file-saver/FileSaver';
import { Message } from 'element-ui'

export default {
  data() {
    return {
      loading: false,
      prettierFlag: false,
      resources: [],
      isDownloading: false,
      debounceedRefresh: debounce(this.refreshDownload.bind(this), 400),
      debounceedSetResource: debounce(this.setResource.bind(this), 200)
    };
  },
  computed: {
    buttonDisabled() {
      return false
    },
    nodeData() {
      const { resources } = this
      if (!resources || !resources.length) return;
      const treeRootNodes = [];
      resources.forEach(item => {
        const instance = item;
        const { url, type } = item;
        const [protocol, rawPath] = url.split('://') || [];
        if (protocol && rawPath) {
          const path = rawPath.split('?')[0]
          let filepath = path;
          if (filepath.slice(-1) === '/') filepath += 'index.html';
          let filename = filepath.substring(filepath.lastIndexOf('/') + 1)

          if (!filename.includes('.')) {
            if (type.includes('script')) {
              filepath += '.js'
            } else if (type.includes('style')) {
              filepath += '.css'
            } else if (type.includes('json')) {
              filepath += 'json'
            } else {
              filepath += '.html'
            }
          }
          const paths = filepath.split('/').map(i => i.replace(/(\.)?\/(\/\/?)?/g, '')).filter(Boolean)
          paths.reduce((nodes, curPath, index) => {
            const hitNode = nodes.find(i => i.label === curPath);
            if (hitNode) return hitNode.children;
            if (index === paths.length - 1) {
              // final filename extra

              instance.filepath = filepath
                .replace(/\:|\\|\=|\*|\.$|\"|\'|\?|\~|\||\<|\>/g, '')
		            .replace(/\/\//g,'/')
		            .replace(/(\s|\.)\//g, '/')
                .replace(/\/(\s|\.)/g, '/')

              instance.filename = filename
              if (nodes.some(i => i.label === filename)) return
              const getContent = instance.getContent.bind(instance)

              instance.getContent = () => new Promise((resolve, reject) => {
                getContent(async (body, encode) => {
                  if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError)
                  }
                  if (/\.(png|jpg|jpeg|gif|ico|woff2?|ttf)/.test(filename)) {
                    encode = 'base64';
                  } else if (this.prettierFlag) {
                    let parser = ''
                    if (/\.jsx?$/.test(filename)) {
                      parser = 'babylon'
                    } else if (/\.tsx?$/.test(filename)) {
                      parser = 'typescript'
                    } else if (/\.(css|scss|sacc|less)/.test(filename)) {
                      parser = 'postcss'
                    } else if (/.vue/.test(filename)) {
                      parser = 'vue'
                    }
                    console.log(parser, filename)
                    try {
                      // body = prettier.format(body, {parser, plugins: prettierPlugins})
                      const content = await prettierScript(parser, body)
                      if (content) body = content
                      // console.log(body)
                    } catch (e) {
                      console.error(e)
                    }
                  }
                  resolve({
                    name: filename,
                    type: instance.type || 'text/plain',
                    originalUrl: instance.url,
                    url: instance.filepath,
                    content: body,
                    encoding: encode
                  })
                })
              })
              const node = {
                instance,
                isLeaf: true,
                label: filename
              }
              nodes.push(node)
            } else {
              const children = [];
              nodes.push({
                label: curPath,
                children
              });
              return children;
            }
          }, treeRootNodes);
        } else {
          // ignore
        }
      });

      return treeRootNodes
    }
  },
  mounted() {
    chrome.devtools.network.onRequestFinished.addListener(this.debounceedRefresh);
    this.debounceedRefresh()
  },
  destroyed() {
    chrome.devtools.network.onRequestFinished.removeListener(this.debounceedRefresh)
  },
  methods: {
    getIcon(node, data) {
      let extraCls = 'default'
      if (data.children) {
        extraCls = 'folder'
      } else if (data.instance) {
        const { instance: {type, filename} } = data
        if (type.includes('script')) {
          extraCls = 'script'
        } else if (type.includes('style')) {
          extraCls = 'style'
        } else if (type.includes('image') || /\.(png|jpg|jpeg|gif|ico|woff2?|ttf)/.test(filename)) {
          extraCls = 'image'
        }
      }
      return `icon icon-${extraCls}`
    },
    resolveURLToPath(url, type) {
      const [protocol, paths] = url.split('://') || [];
      if (protocol && paths) {
        const pathPieces = paths.split('/');
      }
    },
    refreshDownload() {
      if (this.isDownloading) return;
      chrome.devtools.inspectedWindow.getResources(this.debounceedSetResource);
    },
    setResource(resources) {
      if (this.isDownloading) return;
      this.resources = resources.filter(i => !i.url.includes('chrome-extension:'));
    },
    async download() {
      this.loading = true
      try {
        const activedNodes = this.$refs.tree.getCheckedNodes().filter(i => i.isLeaf)
        if (!activedNodes || !activedNodes.length) {
          return Message.warning('please choose files')
        }
        const resolvedFiles = await Promise.all(activedNodes.map(i => i.instance.getContent()))
        const zip = new JSZip()
        resolvedFiles.forEach(item => {
          const options = {}
          console.log(item.encoding)
          if (item.encoding === 'base64') {
            options.base64 = true
          }
          zip.file(item.url, item.content, options)
        })

        const content = await zip.generateAsync({type: 'blob'})
        saveAs(content, `resource-saver-${+new Date()}.zip`)
      } catch (error) {
        console.error(error)
        Message.error(error.message || 'error')
      } finally {
        this.loading = false
      }
    }
  }
};
</script>
<style>
.resource-content-main .label {
  text-align: right;
  line-height: 24px;
  height: 24px;
  padding-right: 10px;
  font-size: 14px;
  color: #333;
}
.resource-content-main {
  padding-bottom: 60px;
  padding-top: 10px;
}
.resource-content-main .el-tree-node__label {
  font-size: 12px;
}
</style>

