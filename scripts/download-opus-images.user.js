// ==UserScript==
// @name         批量下载专栏图片（自动建立子文件夹）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  提取含 new_dyn 的图片，按 001...命名，存入以页面标题命名的文件夹
// @match        https://www.bilibili.com/opus/*
// @grant        GM_download
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // ----- 样式 -----
  GM_addStyle(`
        #downloadBtn {
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            padding: 10px 20px; background: #4CAF50; color: white;
            border: none; border-radius: 5px; cursor: pointer; font-size: 14px;
        }
        #downloadBtn:hover { background: #45a049; }
        #progress {
            position: fixed; bottom: 70px; right: 20px; z-index: 9999;
            background: rgba(0,0,0,0.8); color: #fff; padding: 6px 14px;
            border-radius: 4px; font-size: 14px; display: none;
        }
    `);

  // ----- UI 元素 -----
  const btn = document.createElement("button");
  btn.id = "downloadBtn";
  btn.textContent = "📥 下载图片";
  document.body.appendChild(btn);

  const progressDiv = document.createElement("div");
  progressDiv.id = "progress";
  document.body.appendChild(progressDiv);

  function getOpusId() {
    const match = location.pathname.match(/\/opus\/(\d+)/);
    return match ? match[1] : "";
  }

  function getFolderName() {
    const opusId = getOpusId();

    let titleName = "";

    try {
      const el = document
        .getElementsByClassName("opus-module-title__text")
        .item(0);
      if (el) {
        titleName = el.innerText.trim();
        // 替换 Windows 不允许的文件名字符
        titleName = titleName.replace(/[\\/:*?"<>|]/g, "_");
      }
    } catch (e) {
      console.warn("获取文件夹名失败:", e);
    }

    if (!titleName) {
      titleName = "下载图片";
    }

    // 如果有 opus ID，则用 "ID.标题" 作为文件夹名
    if (opusId) {
      return `${opusId}.${titleName}`;
    }

    // 如果没有匹配到 opus ID，则回退为原标题
    return titleName;
  }

  // ----- 下载事件 -----
  btn.addEventListener("click", async function () {
    // 提取图片 URL（完全按您的要求）
    const urls = Array.from(document.getElementsByTagName("img"))
      .map((el) => el.src)
      .filter((s) => s.includes("new_dyn"))
      .map((s) => s.slice(0, s.lastIndexOf("@")));

    const uniqueUrls = [...new Set(urls)].filter((s) => s.length > 0);
    if (uniqueUrls.length === 0) {
      alert('未找到任何匹配的图片（src 中需包含 "new_dyn"）');
      return;
    }

    const folderName = getFolderName();
    progressDiv.style.display = "block";
    progressDiv.textContent = `准备下载 ${uniqueUrls.length} 个文件到「${folderName}」...`;
    btn.disabled = true;

    // 封装下载为 Promise
    function downloadFile(url, filename) {
      return new Promise((resolve, reject) => {
        GM_download({
          url: url,
          name: filename,
          saveAs: false, // 设为 false 才能自动保存到子文件夹
          onload: resolve,
          onerror: reject,
        });
      });
    }

    let successCount = 0;
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      // 提取扩展名
      let ext = "png";
      const match = url.match(/\.([^\.\/\?]+)(?:[\?\#]|$)/);
      if (match) ext = match[1];

      const indexStr = String(i + 1).padStart(3, "0");
      // ★★★ 关键：在文件名前加上文件夹路径 ★★★
      const fullName = `${folderName}/${indexStr}.${ext}`;

      progressDiv.textContent = `⏳ 正在下载 (${i + 1}/${uniqueUrls.length})：${fullName}`;

      try {
        await downloadFile(url, fullName);
        successCount++;
      } catch (err) {
        console.error(`下载 ${fullName} 失败：`, err);
      }
    }

    progressDiv.textContent = `✅ 完成！成功 ${successCount}/${uniqueUrls.length} 个文件已保存至「${folderName}」`;
    btn.disabled = false;

    // 给标签页标题加上 ✅（避免重复添加）
    if (!document.title.startsWith("✅ ")) {
      document.title = "✅ " + document.title;
    }
  });
})();
