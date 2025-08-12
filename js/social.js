      const LS_FEED = "tesstrip_feed_v2";
      const LS_DRAFT = "tesstrip_draft_v2";
      const MAX_IMAGES = 4;
      const MAX_WIDTH = 1200; // compressed max width
      const MAX_HEIGHT = 900;
      const QUALITY = 0.75; // jpeg quality

      let feed = []; // posts array
      let stagedImages = []; // {name, dataURL}
      let editingPostId = null;

      /* Elements */
      const postText = document.getElementById("postText");
      const chooseBtn = document.getElementById("chooseBtn");
      const fileInput = document.getElementById("fileInput");
      const previewRow = document.getElementById("previewRow");
      const postBtn = document.getElementById("postBtn");
      const feedEl = document.getElementById("feed");
      const exportBtn = document.getElementById("exportBtn");
      const importBtn = document.getElementById("importBtn");
      const importFile = document.getElementById("importFile");
      const clearBtn = document.getElementById("clearBtn");
      const draftMsg = document.getElementById("draftMsg");

      /* Lightbox */
      const lb = document.getElementById("lightbox");
      const lbImg = document.getElementById("lbImg");
      const lbPrev = document.getElementById("lbPrev");
      const lbNext = document.getElementById("lbNext");
      const lbClose = document.getElementById("lbClose");
      let lbImages = [];
      let lbIndex = 0;

      /* Utilities */
      const uid = (p = "id") =>
        p + "_" + Math.random().toString(36).slice(2, 9);
      const nowISO = () => new Date().toISOString();
      function saveFeed() {
        localStorage.setItem(LS_FEED, JSON.stringify(feed));
      }
      function loadFeed() {
        const raw = localStorage.getItem(LS_FEED);
        try {
          feed = raw ? JSON.parse(raw) : [];
        } catch (e) {
          feed = [];
        }
      }
      function saveDraft() {
        localStorage.setItem(
          LS_DRAFT,
          JSON.stringify({ text: postText.value, images: stagedImages })
        );
        draftMsg.textContent = "Draft saved";
      }
      function loadDraft() {
        const raw = localStorage.getItem(LS_DRAFT);
        if (!raw) return;
        try {
          const d = JSON.parse(raw);
          postText.value = d.text || "";
          stagedImages = d.images || [];
          renderPreview();
          updatePostBtn();
          draftMsg.textContent = "Draft loaded";
        } catch (e) {}
      }
      function clearDraft() {
        localStorage.removeItem(LS_DRAFT);
        draftMsg.textContent = "";
      }

      /* Image compression: return promise of dataURL */
      function compressImageFile(file) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const reader = new FileReader();
          reader.onload = () => {
            img.onload = () => {
              let [w, h] = [img.width, img.height];
              let scale = Math.min(1, MAX_WIDTH / w, MAX_HEIGHT / h);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob(
                (blob) => {
                  if (!blob) return resolve(null);
                  const r = new FileReader();
                  r.onload = () =>
                    resolve({ name: file.name, dataURL: r.result });
                  r.onerror = () => resolve(null);
                  r.readAsDataURL(blob);
                },
                "image/jpeg",
                QUALITY
              );
            };
            img.onerror = () => resolve(null);
            img.src = reader.result;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      }

      /* Preview render */
      function renderPreview() {
        previewRow.innerHTML = "";
        stagedImages.forEach((imgObj, idx) => {
          const wrap = document.createElement("div");
          wrap.className = "preview";
          wrap.innerHTML = `<img src="${imgObj.dataURL}" alt="${
            imgObj.name || "image"
          }"><button class="rm" data-idx="${idx}" title="Remove">×</button>`;
          previewRow.appendChild(wrap);
          wrap.querySelector(".rm").addEventListener("click", () => {
            stagedImages.splice(idx, 1);
            renderPreview();
            updatePostBtn();
            saveDraft();
          });
        });
      }

      /* update post button enabled state */
      function updatePostBtn() {
        postBtn.disabled = !(
          postText.value.trim().length || stagedImages.length
        );
      }

      /* event handlers */
      chooseBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const allowed = files.slice(0, MAX_IMAGES - stagedImages.length);
        const results = [];
        for (const f of allowed) {
          const compressed = await compressImageFile(f);
          if (compressed) results.push(compressed);
        }
        stagedImages = stagedImages.concat(results).slice(0, MAX_IMAGES);
        renderPreview();
        updatePostBtn();
        saveDraft();
        fileInput.value = "";
      });

      /* drag & drop for preview area (page-level) */
      ["dragenter", "dragover"].forEach((ev) => {
        document.addEventListener(
          ev,
          (e) => {
            e.preventDefault();
          },
          false
        );
      });
      document.addEventListener("drop", async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (!files.length) return;
        const allowed = files.slice(0, MAX_IMAGES - stagedImages.length);
        const results = [];
        for (const f of allowed) {
          const compressed = await compressImageFile(f);
          if (compressed) results.push(compressed);
        }
        stagedImages = stagedImages.concat(results).slice(0, MAX_IMAGES);
        renderPreview();
        updatePostBtn();
        saveDraft();
      });

      /* autosave draft while typing (debounced) */
      let draftTimer = null;
      postText.addEventListener("input", () => {
        updatePostBtn();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(() => saveDraft(), 800);
      });

      /* create / edit post */
      postBtn.addEventListener("click", () => {
        const text = postText.value.trim();
        const images = stagedImages.map((i) => ({
          name: i.name,
          dataURL: i.dataURL,
        }));
        if (!text && !images.length) return;
        if (editingPostId) {
          const p = feed.find((x) => x.id === editingPostId);
          if (!p) return;
          p.text = text;
          p.images = images;
          p.editedAt = nowISO();
          editingPostId = null;
        } else {
          const post = {
            id: uid("post"),
            text,
            images,
            createdAt: nowISO(),
            editedAt: null,
            likes: 0,
            liked: false,
            comments: [],
          };
          feed.unshift(post);
        }
        saveFeed();
        renderFeed(); // clear draft & inputs
        postText.value = "";
        stagedImages = [];
        renderPreview();
        updatePostBtn();
        clearDraft();
      });

      /* feed render */
      function renderFeed() {
        feedEl.innerHTML = "";
        if (!feed.length) {
          feedEl.innerHTML = `<div class="card small">No posts yet. Create one above!</div>`;
          return;
        }
        feed.forEach((post) => {
          const el = document.createElement("article");
          el.className = "post card";
          el.dataset.id = post.id;
          el.innerHTML = `
      <div class="post-header">
        <div class="avatar">${(post.text || "P")
          .substring(0, 1)
          .toUpperCase()}</div>
        <div>
          <div><strong>You</strong> <span class="small"> · ${new Date(
            post.createdAt
          ).toLocaleString()}</span></div>
          <div class="post-meta small">${
            post.editedAt
              ? "Edited · " + new Date(post.editedAt).toLocaleString()
              : ""
          }</div>
        </div>
        <div class="flex-right">
          <button data-action="edit" class="btn ghost small">Edit</button>
          <button data-action="delete" class="btn ghost small">Delete</button>
        </div>
      </div>
      <div class="post-body">${escapeHtml(post.text || "")}</div>
      ${
        post.images && post.images.length
          ? `<div class="post-images">${post.images
              .map(
                (img, idx) =>
                  `<img src="${img.dataURL}" data-post="${
                    post.id
                  }" data-idx="${idx}" alt="${escapeHtml(img.name)}">`
              )
              .join("")}</div>`
          : ""
      }
      <div class="post-actions">
        <button data-action="like" class="like-btn">${
          post.liked ? "💙 Liked" : "♡ Like"
        } (${post.likes})</button>
        <button data-action="comment" class="btn ghost small">Comment</button>
        <button data-action="share" class="btn ghost small">Share</button>
      </div>
      <div class="comment-list">
        ${
          post.comments && post.comments.length
            ? post.comments
                .map(
                  (c) =>
                    `<div class="comment"><strong>${escapeHtml(
                      c.author
                    )}</strong> <span class="small">· ${new Date(
                      c.at
                    ).toLocaleString()}</span><div>${escapeHtml(
                      c.text
                    )}</div></div>`
                )
                .join("")
            : `<div class="small">No comments yet</div>`
        }
        <div style="margin-top:.6rem;display:flex;gap:.4rem">
          <input class="comment-input" placeholder="Write a comment..." aria-label="Write a comment">
          <button class="btn small comment-send">Send</button>
        </div>
      </div>
    `;
          // event delegation for this post
          el.querySelector('[data-action="like"]').addEventListener(
            "click",
            () => toggleLike(post.id)
          );
          el.querySelector('[data-action="delete"]').addEventListener(
            "click",
            () => deletePost(post.id)
          );
          el.querySelector('[data-action="edit"]').addEventListener(
            "click",
            () => startEditPost(post.id)
          );
          el.querySelector('[data-action="share"]').addEventListener(
            "click",
            () => sharePost(post)
          );
          el.querySelector(".comment-send").addEventListener("click", () => {
            const input = el.querySelector(".comment-input");
            const txt = input.value.trim();
            if (!txt) return;
            addComment(post.id, {
              id: uid("c"),
              author: "You",
              text: txt,
              at: nowISO(),
            });
            input.value = "";
          });
          el.querySelector(".comment-input").addEventListener(
            "keydown",
            (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                el.querySelector(".comment-send").click();
              }
            }
          );
          // image click -> lightbox
          el.querySelectorAll(".post-images img").forEach((imgEl) => {
            imgEl.addEventListener("click", (e) => {
              const pid = imgEl.dataset.post;
              const idx = parseInt(imgEl.dataset.idx, 10);
              openLightbox(pid, idx);
            });
          });

          feedEl.appendChild(el);
        });
      }

      /* actions */
      function toggleLike(postId) {
        const p = feed.find((x) => x.id === postId);
        if (!p) return;
        p.liked = !p.liked;
        p.likes += p.liked ? 1 : -1;
        saveFeed();
        renderFeed();
      }
      function deletePost(postId) {
        if (!confirm("Delete this post?")) return;
        feed = feed.filter((p) => p.id !== postId);
        saveFeed();
        renderFeed();
      }
      function startEditPost(postId) {
        const p = feed.find((x) => x.id === postId);
        if (!p) return;
        editingPostId = p.id;
        postText.value = p.text || "";
        stagedImages = (p.images || []).slice();
        renderPreview();
        updatePostBtn();
        // scroll to top new post area
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      function addComment(postId, comment) {
        const p = feed.find((x) => x.id === postId);
        if (!p) return;
        p.comments = p.comments || [];
        p.comments.push(comment);
        saveFeed();
        renderFeed();
      }
      async function sharePost(post) {
        try {
          if (navigator.share) {
            const shareData = {
              title: "TessTrip post",
              text: post.text || "Check this out",
            };
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(JSON.stringify(post, null, 2));
            alert("Post JSON copied to clipboard (fallback).");
          }
        } catch (err) {
          console.warn("share failed", err);
          alert("Share failed.");
        }
      }

      /* export/import/clear */
      exportBtn.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(feed, null, 2)], {
          type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "tesstrip_feed.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const j = JSON.parse(r.result);
            if (!Array.isArray(j)) return alert("Invalid file format");
            // prepend imported posts
            feed = j.concat(feed);
            saveFeed();
            renderFeed();
            alert("Imported " + j.length + " posts");
          } catch (err) {
            alert("Failed to import: " + err.message);
          }
        };
        r.readAsText(f);
        importFile.value = "";
      });
      clearBtn.addEventListener("click", () => {
        if (!confirm("Clear all feed posts?")) return;
        feed = [];
        saveFeed();
        renderFeed();
        alert("Feed cleared");
      });

      /* Lightbox functions */
      function openLightbox(postId, index) {
        const p = feed.find((x) => x.id === postId);
        if (!p || !p.images || p.images.length === 0) return;
        lbImages = p.images.map((i) => i.dataURL);
        lbIndex = index || 0;
        lbImg.src = lbImages[lbIndex];
        lb.classList.add("visible");
        lb.setAttribute("aria-hidden", "false");
      }
      function closeLightbox() {
        lb.classList.remove("visible");
        lb.setAttribute("aria-hidden", "true");
        lbImg.src = "";
      }
      lbClose.addEventListener("click", closeLightbox);
      lbPrev.addEventListener("click", () => {
        lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
        lbImg.src = lbImages[lbIndex];
      });
      lbNext.addEventListener("click", () => {
        lbIndex = (lbIndex + 1) % lbImages.length;
        lbImg.src = lbImages[lbIndex];
      });
      lb.addEventListener("click", (e) => {
        if (e.target === lb) closeLightbox();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") lbPrev.click();
        if (e.key === "ArrowRight") lbNext.click();
      });

      /* helpers */
      function escapeHtml(s) {
        return String(s || "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[c])
        );
      }

      /* init */
      loadFeed();
      loadDraft();
      renderFeed();
      renderPreview();
      updatePostBtn();