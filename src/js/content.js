import Vue from 'vue'
import ContentApp from './content.vue'
import { getWorker } from './util/helper'
import '../css/content.css'

import {
  Button,
  Checkbox,
  Tree,
  Col,
  Row,
  Form,
  FormItem,
  Switch,
} from 'element-ui'

Vue.use(Button)
Vue.use(Checkbox)
Vue.use(Tree)
Vue.use(Col)
Vue.use(Row)
Vue.use(Form)
Vue.use(FormItem)
Vue.use(Switch)

Vue.prototype.$worker = getWorker()

new Vue({
  render: h => h(ContentApp)
}).$mount('#app')
