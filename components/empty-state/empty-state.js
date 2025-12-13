// components/empty-state/empty-state.js
Component({
  properties: {
    icon: {
      type: String,
      value: '📋'
    },
    text: {
      type: String,
      value: '暂无数据'
    },
    tip: {
      type: String,
      value: ''
    },
    actionText: {
      type: String,
      value: ''
    }
  },

  data: {},

  methods: {
    onAction() {
      this.triggerEvent('action');
    }
  }
});



































