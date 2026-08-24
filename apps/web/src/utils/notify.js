export function formatNotice(title, description) {
  if (!description) return title;
  return `${title} - ${description}`;
}

let activeMessageApi = null;

const sharedAdapter = {
  success: (input) => {
    const { message, description } = normalizeInput(input);
    if (!message || !activeMessageApi) return;
    activeMessageApi.success(formatNotice(message, description));
  },
  error: (input) => {
    const { message, description } = normalizeInput(input);
    if (!message || !activeMessageApi) return;
    activeMessageApi.error(formatNotice(message, description));
  },
  info: (input) => {
    const { message, description } = normalizeInput(input);
    if (!message || !activeMessageApi) return;
    activeMessageApi.info(formatNotice(message, description));
  },
  warning: (input) => {
    const { message, description } = normalizeInput(input);
    if (!message || !activeMessageApi) return;
    activeMessageApi.warning(formatNotice(message, description));
  },
};

function normalizeInput(input) {
  if (!input) return { message: '' };
  if (typeof input === 'string') return { message: input };
  return input;
}

export function buildMessageAdapter(messageApi) {
  activeMessageApi = messageApi ?? null;
  return sharedAdapter;
}
