// Sample tasks for the prototype, placed around today so the calendar always looks lived-in.
import { newTask, newProject } from "./model.js";
import { toISO, addDays, weekKey } from "./lib/date.js";

export function defaultProjects() {
  return [
    newProject({ id: "p-training", name: "Training", color: "blue", createdAt: 1 }),
    newProject({ id: "p-admin", name: "Admin", color: "amber", createdAt: 2 }),
    newProject({ id: "p-personal", name: "Personal", color: "violet", createdAt: 3 })
  ];
}

// [day offset, title, project, status, due offset, extra]
const ROWS = [
  [-15, "Tổng hợp kết quả khảo sát tháng trước", "admin", "done", -14],
  [-13, "Outline bài giảng An toàn thực phẩm", "training", "done"],
  [-12, "Gửi báo cáo đào tạo tháng trước", "admin", "done", -12],
  [-9, "Họp lịch học với các trưởng nhóm", "admin", "done"],
  [-8, "Thiết kế slide PCCC", "training", "done"],
  [-8, "Đặt phòng học và máy chiếu", "admin", "done"],
  [-7, "Review câu hỏi kiểm tra An toàn lao động", "training", "done"],
  [-6, "Dạy lớp An toàn thực phẩm – lớp 05", "training", "done"],
  [-5, "Tổng hợp điểm kiểm tra cuối khóa", "admin", "in_progress", -2],
  [-2, "Lên outline khóa Kỹ năng phục vụ", "training", "done", null, { focus: true }],
  [-2, "Họp nhóm đào tạo", "admin", "done"],
  [-1, "Thiết kế slide Kỹ năng phục vụ", "training", "done"],
  [-1, "Gia hạn bảo hiểm xe máy", "personal", "todo", -1],
  [0, "Hoàn thiện slide Kỹ năng phục vụ", "training", "in_progress", 2, {
    focus: true, priority: "high",
    notes: "Bổ sung ví dụ minh họa cho phần thực hành. Gửi Trưởng nhóm duyệt trước thứ Sáu.",
    checklist: [["Viết tình huống mở đầu", true], ["Thêm ví dụ thực tế", true], ["Kiểm tra chính tả", false]]
  }],
  [0, "Kiểm tra dữ liệu chấm công", "admin", "todo"],
  [0, "Gửi lịch học tuần sau", "admin", "todo", 1],
  [0, "Nhắc các nhóm nộp danh sách học viên", "admin", "todo"],
  [0, "Gọi điện cho mẹ", "personal", "todo"],
  [1, "Review bài giảng với Trưởng nhóm", "training", "todo", 1],
  [2, "Dạy lớp Kỹ năng phục vụ – lớp 12", "training", "todo"],
  [2, "Gửi báo cáo tuần", "admin", "todo", 2],
  [3, "Yoga", "personal", "todo"],
  [5, "Soạn câu hỏi kiểm tra PCCC", "training", "todo", 6],
  [6, "Họp vận hành", "admin", "todo"],
  [7, "Dạy lớp PCCC – lớp 03", "training", "todo"],
  [7, "Cập nhật hồ sơ đào tạo", "admin", "todo", 9],
  [9, "Khám sức khỏe định kỳ", "personal", "todo"],
  [9, "Báo cáo đánh giá sau đào tạo", "training", "todo", 13],
  [12, "Kế hoạch đào tạo tháng sau", "training", "todo"],
  [14, "Tổng hợp kết quả khảo sát tháng này", "admin", "todo"],
  [16, "Chốt báo cáo tháng", "admin", "todo", 17],
  [null, "Tìm video minh họa rửa tay đúng cách", "training", "todo"],
  [null, "Đọc tài liệu quy trình 5S", "training", "todo"],
  [null, "Mua sổ tay mới", "personal", "todo"]
];

export function sampleData(today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const focusKey = weekKey(base);
  const tasks = ROWS.map(([day, title, project, status, due, extra = {}], i) => newTask({
    id: "sample-" + i,
    title,
    status,
    statusBeforeDone: status === "done" ? "todo" : null,
    projectId: "p-" + project,
    scheduledDate: day === null ? null : toISO(addDays(base, day)),
    dueDate: due == null ? null : toISO(addDays(base, due)),
    priority: extra.priority || "medium",
    notes: extra.notes || "",
    checklist: (extra.checklist || []).map(([text, done], j) => ({ id: `sample-${i}-c${j}`, text, done })),
    focusWeek: extra.focus ? focusKey : null,
    completedAt: status === "done" ? Date.now() : null,
    createdAt: 1000 + i
  }));
  return { projects: defaultProjects(), tasks };
}
