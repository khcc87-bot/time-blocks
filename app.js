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

  const state = {
    tasks: [
      {
        id: "breakfast",
        name: "早餐",
        minutes: 30,
        fixed: true,
        color: colors[3],
      },
      { id: "lunch", name: "午餐", minutes: 60, fixed: true, color: colors[2] },
      {
        id: "dinner",
        name: "晚餐",
        minutes: 60,
        fixed: true,
        color: colors[0],
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
      color: colors[state.tasks.length % colors.length],
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
    var pieces = Array.from({ length: 120 }, function () {
      return {
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.3,
        size: 7 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2.2 + Math.random() * 4,
        spin: Math.random() * Math.PI,
        drift: -1.8 + Math.random() * 3.6,
      };
    });
    var start = performance.now();

    function frame(now) {
      confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach(function (p) {
        p.y += p.speed;
        p.x += p.drift;
        p.spin += 0.12;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.spin);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        confettiCtx.restore();
      });
      if (now - start < 2800) {
        requestAnimationFrame(frame);
      } else {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
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
