import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";
import "roboto-fontface/css/roboto/roboto-fontface.css";
import "@mdi/font/css/materialdesignicons.css";
import VueTheMask from "vue-the-mask";
import BindTitle from "./components/BindTitle.vue";
import DateInput from "./components/DateInput.vue";

Vue.use(VueTheMask);

Vue.component("BindTitle", BindTitle);
Vue.component("DateInput", DateInput);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
