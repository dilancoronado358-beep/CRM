import { sileo as s } from 'sileo';

export const sileo = {
  success: (msg, opts = {}) => {
    const title = typeof msg === 'string' ? msg : msg.title;
    const description = typeof msg === 'string' ? opts.description : msg.description;
    return s.success({ title, description, ...opts });
  },
  error: (msg, opts = {}) => {
    const title = typeof msg === 'string' ? msg : msg.title;
    const description = typeof msg === 'string' ? opts.description : msg.description;
    return s.error({ title, description, ...opts });
  },
  info: (msg, opts = {}) => {
    const title = typeof msg === 'string' ? msg : msg.title;
    const description = typeof msg === 'string' ? opts.description : msg.description;
    return s.info({ title, description, ...opts });
  },
  warning: (msg, opts = {}) => {
    const title = typeof msg === 'string' ? msg : msg.title;
    const description = typeof msg === 'string' ? opts.description : msg.description;
    return s.warning({ title, description, ...opts });
  },
  show: s.show,
  dismiss: s.dismiss,
  promise: s.promise,
  clear: s.clear
};
