(function () {
  const DAY_START = 7 * 60;
  const DAY_END = 20 * 60 + 30;
  const DAY_CAPACITY = DAY_END - DAY_START;
  const colors = [
    "#ff6f61",
    "#67c7ff",
    "#46d6a7",
    "#ffcc4d",
    "#b980ff",
    "#ff9f43",
  ];

  // 依照時間長度決定積木顏色
  function colorByMinutes(minutes) {
    if (minutes <= 30) return "#67c7ff"; // 藍色：30 分鐘以內
    if (minutes <= 60) return "#46d6a7"; // 綠色：31-60 分鐘
    if (minutes <= 90) return "#ffcc4d"; // 黃色：61-90 分鐘
    return "#ff6f61"; // 紅色：91 分鐘以上
  }

  const state = {
    tasks: [
      {
        id: "breakfast",
        name: "早餐",
        minutes: 30,
        fixed: true,
        color: colorByMinutes(30),
      },
      {
        id: "lunch",
        name: "午餐",
        minutes: 60,
        fixed: true,
        color: colorByMinutes(60),
      },
      {
        id: "dinner",
        name: "晚餐",
        minutes: 60,
        fixed: true,
        color: colorByMinutes(60),
      },
    ],
    timeline: [],
    locked: false,
    celebrated: false,
  };

  const taskPool = document.querySelector("#taskPool");
  const timeline = document.querySelector("#timeline");
  const timeLabels = document.querySelector("#timeLabels");
  const taskForm = document.querySelector("#taskForm");
  const taskName = document.querySelector("#taskName");
  const taskMinutes = document.querySelector("#taskMinutes");
  const lockButton = document.querySelector("#lockButton");
  const resetButton = document.querySelector("#resetButton");
  const progressBar = document.querySelector("#progressBar");
  const scoreText = document.querySelector("#scoreText");
  const scoreHint = document.querySelector("#scoreHint");
  const capacityText = document.querySelector("#capacityText");
  const toast = document.querySelector("#toast");
  const confettiCanvas = document.querySelector("#confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");

  let toastTimer = 0;

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function formatTime(totalMinutes) {
    var h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, "0");
    var m = (totalMinutes % 60).toString().padStart(2, "0");
    return h + ":" + m;
  }

  function scheduledMinutes() {
    return state.timeline.reduce(function (sum, item) {
      return sum + item.minutes;
    }, 0);
  }

  function completedMinutes() {
    return state.timeline.reduce(function (sum, item) {
      return sum + (item.done ? item.minutes : 0);
    }, 0);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2200);
  }

  function addToTimeline(taskId) {
    var task = state.tasks.find(function (t) {
      return t.id === taskId;
    });
    if (!task || state.locked) return;
    if (scheduledMinutes() + task.minutes > DAY_CAPACITY) {
      showToast("一天的時間積木裝不下囉！");
      return;
    }
    state.timeline.push({
      id: uid("plan"),
      name: task.name,
      minutes: task.minutes,
      color: task.color,
      fixed: task.fixed,
      sourceTaskId: task.id,
      done: false,
    });
    render();
  }

  function removeFromTimeline(planId) {
    state.timeline = state.timeline.filter(function (item) {
      return item.id !== planId;
    });
    render();
  }

  function moveBlock(planId, direction) {
    var idx = state.timeline.findIndex(function (item) {
      return item.id === planId;
    });
    if (idx < 0) return;
    var targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= state.timeline.length) return;
    var temp = state.timeline[idx];
    state.timeline[idx] = state.timeline[targetIdx];
    state.timeline[targetIdx] = temp;
    render();
  }

  function toggleComplete(planId) {
    var item = state.timeline.find(function (t) {
      return t.id === planId;
    });
    if (item) {
      item.done = !item.done;
      render();
    }
  }

  function renderPool() {
    taskPool.innerHTML = "";
    state.tasks.forEach(function (task) {
      var block = document.createElement("article");
      block.className = "time-block";
      block.style.setProperty("--block-color", task.color);
      block.setAttribute("role", "button");
      block.setAttribute("tabindex", "0");
      block.setAttribute(
        "aria-label",
        task.name + "，" + task.minutes + " 分鐘",
      );
      block.innerHTML =
        "<strong>" +
        task.name +
        "</strong><span class='block-minutes'>" +
        task.minutes +
        " 分鐘</span>";

      block.addEventListener("click", function () {
        if (!state.locked) addToTimeline(task.id);
      });
      block.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!state.locked) addToTimeline(task.id);
        }
      });

      taskPool.appendChild(block);
    });
  }

  function renderTimeLabels() {
    timeLabels.innerHTML = "";
    for (var minutes = DAY_START; minutes <= DAY_END; minutes += 60) {
      var label = document.createElement("span");
      label.className = "time-label";
      label.textContent = formatTime(minutes);
      label.style.top = ((minutes - DAY_START) / DAY_CAPACITY) * 100 + "%";
      timeLabels.appendChild(label);
    }
    if ((DAY_END - DAY_START) % 60 !== 0) {
      var endLabel = document.createElement("span");
      endLabel.className = "time-label";
      endLabel.textContent = formatTime(DAY_END);
      endLabel.style.top = "100%";
      timeLabels.appendChild(endLabel);
    }
  }

  function renderTimeline() {
    timeline.innerHTML = "";
    var isEmpty = state.timeline.length === 0;
    timeline.classList.toggle("empty", isEmpty);

    var cursor = DAY_START;
    state.timeline.forEach(function (item, index) {
      var block = document.createElement("article");
      block.className = "time-block";
      if (item.done) block.classList.add("is-complete");
      block.style.setProperty("--block-color", item.color);
      block.dataset.id = item.id;
      block.dataset.minutes = item.minutes;
      block.style.height = (item.minutes / DAY_CAPACITY) * 100 + "%";

      var startStr = formatTime(cursor);
      var endStr = formatTime(cursor + item.minutes);
      block.title = startStr + " - " + endStr;

      block.innerHTML =
        "<strong>" +
        item.name +
        "</strong>" +
        "<span class='block-time-range'>" +
        startStr +
        " - " +
        endStr +
        "</span>";

      if (!state.locked) {
        var controls = document.createElement("span");
        controls.className = "block-controls";

        if (index > 0) {
          var upBtn = document.createElement("button");
          upBtn.className = "btn-move";
          upBtn.textContent = "▲";
          upBtn.title = "上移";
          upBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            moveBlock(item.id, -1);
          });
          controls.appendChild(upBtn);
        }

        if (index < state.timeline.length - 1) {
          var downBtn = document.createElement("button");
          downBtn.className = "btn-move";
          downBtn.textContent = "▼";
          downBtn.title = "下移";
          downBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            moveBlock(item.id, 1);
          });
          controls.appendChild(downBtn);
        }

        var removeBtn = document.createElement("button");
        removeBtn.className = "btn-remove";
        removeBtn.textContent = "✕";
        removeBtn.title = "移除";
        removeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          removeFromTimeline(item.id);
        });
        controls.appendChild(removeBtn);

        block.appendChild(controls);
      }

      block.addEventListener("click", function () {
        if (state.locked) toggleComplete(item.id);
      });

      cursor += item.minutes;
      timeline.appendChild(block);
    });

    var remaining = DAY_CAPACITY - scheduledMinutes();
    if (remaining > 0 && !isEmpty) {
      var spacer = document.createElement("div");
      spacer.className = "timeline-remaining";
      spacer.style.height = (remaining / DAY_CAPACITY) * 100 + "%";
      spacer.textContent = "剩餘 " + remaining + " 分鐘";
      timeline.appendChild(spacer);
    }
  }

  function renderScore() {
    var total = scheduledMinutes();
    var done = completedMinutes();
    var score = total > 0 ? Math.round((done / total) * 100) : 0;
    progressBar.style.width = score + "%";
    scoreText.textContent = score + " 分";
    capacityText.textContent =
      "已安排 " + total + " / " + DAY_CAPACITY + " 分鐘";

    if (!total) {
      scoreHint.textContent = "先把積木放進今日時間表吧。";
    } else if (!state.locked) {
      scoreHint.textContent = "排好後按下鎖定，就可以開始打卡。";
    } else if (score >= 80) {
      scoreHint.textContent = "太棒了，今天的時間任務完成很多！";
    } else {
      scoreHint.textContent = "已完成 " + done + " 分鐘，繼續加油。";
    }

    if (score >= 80 && total > 0 && state.locked && !state.celebrated) {
      state.celebrated = true;
      launchConfetti();
    }
    if (score < 80) {
      state.celebrated = false;
    }
  }

  function render() {
    document.body.classList.toggle("is-locked", state.locked);
    taskForm.querySelectorAll("input, button").forEach(function (el) {
      el.disabled = state.locked;
    });
    lockButton.textContent = state.locked
      ? "解除鎖定 / 回到編輯"
      : "鎖定 / 開始執行";
    lockButton.classList.toggle("is-running", state.locked);
    resetButton.disabled = state.locked;
    renderPool();
    renderTimeline();
    renderScore();
  }

  taskForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = taskName.value.trim();
    var minutes = Number(taskMinutes.value);
    if (!name) {
      showToast("先幫積木取一個名字吧。");
      taskName.focus();
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > DAY_CAPACITY) {
      showToast("請輸入 5 到 810 之間的分鐘數。");
      taskMinutes.focus();
      return;
    }
    state.tasks.push({
      id: uid("task"),
      name: name,
      minutes: Math.round(minutes),
      fixed: false,
      color: colorByMinutes(Math.round(minutes)),
    });
    taskForm.reset();
    render();
  });

  lockButton.addEventListener("click", function () {
    if (!state.timeline.length && !state.locked) {
      showToast("先安排幾個時間積木，再開始執行。");
      return;
    }
    state.locked = !state.locked;
    if (!state.locked) {
      state.timeline.forEach(function (item) {
        item.done = false;
      });
    }
    render();
  });

  resetButton.addEventListener("click", function () {
    state.timeline = [];
    render();
  });

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth * window.devicePixelRatio;
    confettiCanvas.height = window.innerHeight * window.devicePixelRatio;
    confettiCtx.setTransform(
      window.devicePixelRatio,
      0,
      0,
      window.devicePixelRatio,
      0,
      0,
    );
  }

  function launchConfetti() {
    resizeConfettiCanvas();
    var W = window.innerWidth;
    var H = window.innerHeight;
    var fireworkColors = [
      "#ff6f61",
      "#67c7ff",
      "#46d6a7",
      "#ffcc4d",
      "#b980ff",
      "#ff9f43",
      "#ff4da6",
      "#00e5ff",
    ];
    var rockets = [];
    var particles = [];
    var sparkles = [];

    // 發射多波煙火
    function spawnRocket() {
      rockets.push({
        x: W * 0.15 + Math.random() * W * 0.7,
        y: H,
        targetY: H * 0.15 + Math.random() * H * 0.35,
        speed: 4 + Math.random() * 3,
        color:
          fireworkColors[Math.floor(Math.random() * fireworkColors.length)],
        trail: [],
      });
    }

    // 爆炸產生粒子
    function explode(x, y, color) {
      var count = 60 + Math.floor(Math.random() * 40);
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        var speed = 1.5 + Math.random() * 4;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
          color: color,
          size: 2 + Math.random() * 2.5,
        });
      }
      // 中心閃光
      sparkles.push({ x: x, y: y, life: 1, size: 30 + Math.random() * 20 });
    }

    // 分批發射
    var launchTimes = [];
    for (var i = 0; i < 8; i++) {
      launchTimes.push(i * 350 + Math.random() * 200);
    }

    var start = performance.now();
    var duration = 4500;

    function frame(now) {
      var elapsed = now - start;
      confettiCtx.globalCompositeOperation = "source-over";
      confettiCtx.fillStyle = "rgba(0, 0, 0, 0.15)";
      confettiCtx.fillRect(0, 0, W, H);
      confettiCtx.globalCompositeOperation = "lighter";

      // 發射煙火
      for (var i = launchTimes.length - 1; i >= 0; i--) {
        if (elapsed >= launchTimes[i]) {
          spawnRocket();
          launchTimes.splice(i, 1);
        }
      }

      // 更新火箭
      for (var r = rockets.length - 1; r >= 0; r--) {
        var rk = rockets[r];
        rk.y -= rk.speed;
        rk.trail.push({ x: rk.x, y: rk.y });
        if (rk.trail.length > 8) rk.trail.shift();
        // 畫尾跡
        for (var t = 0; t < rk.trail.length; t++) {
          var alpha = (t / rk.trail.length) * 0.6;
          confettiCtx.beginPath();
          confettiCtx.arc(rk.trail[t].x, rk.trail[t].y, 2, 0, Math.PI * 2);
          confettiCtx.fillStyle = "rgba(255,255,200," + alpha + ")";
          confettiCtx.fill();
        }
        if (rk.y <= rk.targetY) {
          explode(rk.x, rk.y, rk.color);
          rockets.splice(r, 1);
        }
      }

      // 更新粒子
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.04; // 重力
        pt.vx *= 0.985;
        pt.vy *= 0.985;
        pt.life -= pt.decay;
        if (pt.life <= 0) {
          particles.splice(p, 1);
          continue;
        }
        confettiCtx.beginPath();
        confettiCtx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
        confettiCtx.fillStyle = pt.color;
        confettiCtx.globalAlpha = pt.life;
        confettiCtx.fill();
        confettiCtx.globalAlpha = 1;
      }

      // 中心閃光
      for (var s = sparkles.length - 1; s >= 0; s--) {
        var sp = sparkles[s];
        sp.life -= 0.04;
        if (sp.life <= 0) {
          sparkles.splice(s, 1);
          continue;
        }
        confettiCtx.beginPath();
        confettiCtx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
        confettiCtx.fillStyle = "rgba(255,255,255," + sp.life * 0.7 + ")";
        confettiCtx.fill();
      }

      if (elapsed < duration || particles.length > 0) {
        requestAnimationFrame(frame);
      } else {
        confettiCtx.globalCompositeOperation = "source-over";
        confettiCtx.clearRect(0, 0, W, H);
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resizeConfettiCanvas);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  renderTimeLabels();
  render();
})();
