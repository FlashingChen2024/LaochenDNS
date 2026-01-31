import { useState } from "react";
import { RecordModal } from "../../src/pages/RecordsPage";

type Notice = {
  id: string;
  message: string;
};

function NoticeView({ notices }: { notices: Notice[] }) {
  return (
    <div>
      {notices.map((notice) => (
        <div key={notice.id}>{notice.message}</div>
      ))}
    </div>
  );
}

export function ModalHarness({ mode }: { mode: "success" | "error" }) {
  const [open, setOpen] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);

  const pushNotice = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotices([{ id, message }]);
  };

  const notifySuccess = (message: string) => {
    pushNotice(message);
  };

  const notifyError = (error: unknown) => {
    if (error instanceof Error) {
      pushNotice(error.message);
      return;
    }
    pushNotice(String(error));
  };

  return (
    <div>
      <NoticeView notices={notices} />
      {open ? (
        <RecordModal
          title="新增记录"
          initial={null}
          onClose={() => setOpen(false)}
          onSubmit={async () => {
            if (mode === "success") {
              notifySuccess("记录新增成功");
              return;
            }
            const error = new Error("创建失败");
            notifyError(error);
            throw error;
          }}
        />
      ) : (
        <div>已关闭</div>
      )}
    </div>
  );
}
