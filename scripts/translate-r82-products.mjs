import fs from "node:fs";
const old = JSON.parse(
  fs.readFileSync(
    "C:/Users/Administrator/Documents/web-test/src/data/en.json",
    "utf8",
  ),
);
const path = "src/data/en.json";
const target = JSON.parse(fs.readFileSync(path, "utf8"));
const corpus = ["bd11", "qiyuan", "snow11"]
  .map((id) => fs.readFileSync(`src/content/products/${id}.md`, "utf8"))
  .join("\n");
for (const [zh, en] of Object.entries(old))
  if (corpus.includes(zh) && !target[zh]) target[zh] = en;
Object.assign(target, {
  "通透复式，让生活舒展。": "An open duplex, with room to live.",
  "留一间书房，也留一份从容。": "A room to work. Space to unwind.",
  "独栋双层复式全装配式预制别墅，通透复式格局，空间舒适舒展，适配高品质自住需求。":
    "A detached two-storey prefabricated villa with an open duplex layout and generous space for everyday family living.",
  "独栋双层复式全装配式预制别墅，多功能书房布局，空间层次丰富，适配品质家庭自住。":
    "A detached two-storey prefabricated villa with a versatile study and distinct living spaces for family life.",
  "两层全装配式预制房屋，空间充裕，自带独立车库，适配多成员家庭长期居住需求。":
    "A spacious two-storey prefabricated home with a separate garage, designed for long-term living by larger families.",
  "探索灰度空间、灰度空间经济款、半打4S、5S、6S、半打8、半打9、半打11、栖元与诗诺1.1，了解户型、面积、结构与装运参考。":
    "Explore Grey-Space Unit, Grey-Space Unit Economy, BD-4S, BD-5S, BD-6S, BD-8, BD-9, BD11, QiYuan and Snow 1.1. Compare layouts, floor areas, construction and shipping references.",
});
fs.writeFileSync(path, JSON.stringify(target, null, 2) + "\n");
