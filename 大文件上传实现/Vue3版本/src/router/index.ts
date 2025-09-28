import { createRouter, createWebHistory } from 'vue-router'
import UploadPage from '@/views/UploadPage.vue'

const routes = [
  {
    path: '/',
    name: 'Upload',
    component: UploadPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 