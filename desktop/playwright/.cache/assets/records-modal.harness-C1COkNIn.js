import { j as jsxRuntimeExports, R as RecordModal } from './RecordsPage-NOycIU5G.js';
import { r as reactExports } from './index-Bxu5kY3x.js';

function NoticeView({ notices }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: notices.map((notice) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: notice.message }, notice.id)) });
}
function ModalHarness({ mode }) {
  const [open, setOpen] = reactExports.useState(true);
  const [notices, setNotices] = reactExports.useState([]);
  const pushNotice = (message) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotices([{ id, message }]);
  };
  const notifySuccess = (message) => {
    pushNotice(message);
  };
  const notifyError = (error) => {
    if (error instanceof Error) {
      pushNotice(error.message);
      return;
    }
    pushNotice(String(error));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(NoticeView, { notices }),
    open ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecordModal,
      {
        title: "新增记录",
        initial: null,
        onClose: () => setOpen(false),
        onSubmit: async () => {
          if (mode === "success") {
            notifySuccess("记录新增成功");
            return;
          }
          const error = new Error("创建失败");
          notifyError(error);
          throw error;
        }
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "已关闭" })
  ] });
}

export { ModalHarness };
//# sourceMappingURL=records-modal.harness-C1COkNIn.js.map
