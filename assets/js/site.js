import * as THREE from "../vendor/three.module.min.js";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  pointerX: 0,
  pointerY: 0,
  scrollProgress: 0,
  scene: "hero",
  sceneProgress: 0,
  paused: prefersReducedMotion.matches,
  project: null,
};

const scenePalette = {
  hero: "#f6f3ea",
  system: "#2864dc",
  work: "#e5c46a",
  journey: "#8467aa",
  beyond: "#e5c46a",
  contact: "#f6f3ea",
};

const projectPalette = {
  fatigue: "#56f0c8",
  imu: "#74a7ff",
  fit3d: "#a486ff",
  billiards: "#ffd166",
  muscle: "#ff8f66",
};

function initInterface() {
  const header = document.querySelector("#site-header");
  const progress = document.querySelector("#scroll-progress-bar");
  const menuToggle = document.querySelector("#menu-toggle");
  const nav = document.querySelector("#site-nav");
  const motionToggle = document.querySelector("#motion-toggle");
  const chapters = [...document.querySelectorAll("[data-scene]")];
  const navLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];

  const updateScrollState = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.transform = `scaleX(${state.scrollProgress})`;
    header.classList.toggle("is-scrolled", window.scrollY > 24);

    let active = chapters[0];
    let closest = Number.POSITIVE_INFINITY;
    const probe = window.innerHeight * 0.48;
    chapters.forEach((chapter) => {
      const rect = chapter.getBoundingClientRect();
      const distance = Math.abs(rect.top - probe);
      if (rect.top <= probe && rect.bottom >= probe) {
        active = chapter;
        closest = -1;
      } else if (closest !== -1 && distance < closest) {
        closest = distance;
        active = chapter;
      }
    });

    const rect = active.getBoundingClientRect();
    state.scene = active.dataset.scene;
    state.sceneProgress = clamp((probe - rect.top) / Math.max(rect.height, 1));
    const accent = state.project ? projectPalette[state.project] : (active.dataset.accent || scenePalette[state.scene]);
    document.documentElement.style.setProperty("--accent", accent);

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${active.id}`);
    });
  };

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateScrollState();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
  window.addEventListener("resize", updateScrollState, { passive: true });
  updateScrollState();

  window.addEventListener("pointermove", (event) => {
    state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5%" });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  const filterButtons = [...document.querySelectorAll(".filter-button")];
  const cards = [...document.querySelectorAll(".project-card")];
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      cards.forEach((card) => {
        const visible = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !visible);
      });
    });
  });

  cards.forEach((card) => {
    const activate = () => {
      state.project = card.dataset.project;
      document.documentElement.style.setProperty("--accent", projectPalette[state.project] || scenePalette.work);
    };
    const deactivate = () => {
      state.project = null;
      document.documentElement.style.setProperty("--accent", scenePalette[state.scene]);
    };
    card.addEventListener("pointerenter", activate);
    card.addEventListener("pointerleave", deactivate);
    card.addEventListener("focusin", activate);
    card.addEventListener("focusout", deactivate);
  });

  const metric = document.querySelector("[data-count]");
  if (metric) {
    const countObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      const target = Number(metric.dataset.count);
      const start = performance.now();
      const update = (now) => {
        const progressValue = clamp((now - start) / 1100);
        const eased = 1 - Math.pow(1 - progressValue, 3);
        metric.textContent = (target * eased).toFixed(2);
        if (progressValue < 1 && !state.paused) requestAnimationFrame(update);
        else metric.textContent = target.toFixed(2);
      };
      requestAnimationFrame(update);
      countObserver.disconnect();
    }, { threshold: .45 });
    countObserver.observe(metric);
  }

  motionToggle.addEventListener("click", () => {
    state.paused = !state.paused;
    document.body.classList.toggle("motion-paused", state.paused);
    motionToggle.setAttribute("aria-pressed", String(state.paused));
    motionToggle.textContent = state.paused ? "Resume motion" : "Pause motion";
  });

  if (state.paused) {
    document.body.classList.add("motion-paused");
    motionToggle.setAttribute("aria-pressed", "true");
    motionToggle.textContent = "Resume motion";
  }

  prefersReducedMotion.addEventListener("change", (event) => {
    state.paused = event.matches;
    document.body.classList.toggle("motion-paused", state.paused);
    motionToggle.setAttribute("aria-pressed", String(state.paused));
    motionToggle.textContent = state.paused ? "Resume motion" : "Pause motion";
  });
}

function initMiniVisuals() {
  const canvases = [...document.querySelectorAll(".project-viz")];
  const visualizers = canvases.map((canvas) => {
    const context = canvas.getContext("2d");
    return { canvas, context, type: canvas.dataset.viz, width: 0, height: 0 };
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    visualizers.forEach((viz) => {
      const rect = viz.canvas.getBoundingClientRect();
      viz.width = rect.width;
      viz.height = rect.height;
      viz.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      viz.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      viz.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const drawSkeleton = (viz, time) => {
    const { context: ctx, width: width, height: height } = viz;
    ctx.clearRect(0, 0, width, height);
    const centerX = width * .68;
    const centerY = height * .5;
    const scale = Math.min(width, height) * .2;
    const sway = state.paused ? 0 : Math.sin(time * 1.8) * .09;
    const points = {
      head: [centerX, centerY - scale * 1.8], neck: [centerX, centerY - scale * 1.25],
      leftShoulder: [centerX - scale * .65, centerY - scale * 1.1], rightShoulder: [centerX + scale * .65, centerY - scale * 1.1],
      leftElbow: [centerX - scale * 1.0, centerY - scale * .2], rightElbow: [centerX + scale * 1.08, centerY - scale * .3],
      leftHand: [centerX - scale * .7, centerY + scale * .65], rightHand: [centerX + scale * .82, centerY + scale * .6],
      hip: [centerX + sway * scale, centerY + scale * .45],
      leftKnee: [centerX - scale * .48, centerY + scale * 1.25], rightKnee: [centerX + scale * .55, centerY + scale * 1.18],
      leftFoot: [centerX - scale * .82, centerY + scale * 1.9], rightFoot: [centerX + scale * .9, centerY + scale * 1.82],
    };
    const links = [["head","neck"],["neck","leftShoulder"],["neck","rightShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftHand"],["rightShoulder","rightElbow"],["rightElbow","rightHand"],["neck","hip"],["hip","leftKnee"],["leftKnee","leftFoot"],["hip","rightKnee"],["rightKnee","rightFoot"]];
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(86,240,200,.74)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(86,240,200,.65)";
    links.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(...points[a]); ctx.lineTo(...points[b]); ctx.stroke();
    });
    Object.values(points).forEach(([x, y], index) => {
      ctx.beginPath(); ctx.arc(x, y, index === 0 ? 5 : 3, 0, Math.PI * 2); ctx.fillStyle = index === 0 ? "#f4f7f5" : "#56f0c8"; ctx.fill();
    });
    ctx.shadowBlur = 0;
  };

  const drawGait = (viz, time) => {
    const { context: ctx, width, height } = viz;
    ctx.clearRect(0, 0, width, height);
    const colors = ["rgba(116,167,255,.9)", "rgba(86,240,200,.7)", "rgba(255,143,102,.7)"];
    colors.forEach((color, lineIndex) => {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const normalized = x / Math.max(width, 1);
        const y = height * (.52 + lineIndex * .07) + Math.sin(normalized * Math.PI * 3.2 + lineIndex * 1.3 + (state.paused ? 0 : time * .45)) * height * (.12 - lineIndex * .015);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineIndex === 0 ? 2 : 1;
      ctx.stroke();
    });
  };

  return (time) => {
    visualizers.forEach((viz) => viz.type === "skeleton" ? drawSkeleton(viz, time) : drawGait(viz, time));
  };
}

function initAvatar() {
  const canvas = document.querySelector("#avatar-canvas");
  const stage = document.querySelector("#avatar-stage");
  if (!canvas || !window.WebGLRenderingContext) {
    stage.classList.add("has-fallback");
    return null;
  }

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, .35, 9.2);
    camera.lookAt(0, .15, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const hemisphere = new THREE.HemisphereLight(0xc8fff0, 0x1c2332, 2.1);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
    keyLight.position.set(4, 7, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x56f0c8, 16, 12);
    rimLight.position.set(-4, 2, 3);
    scene.add(rimLight);
    const warmLight = new THREE.PointLight(0xffa45f, 10, 9);
    warmLight.position.set(4, -1, 4);
    scene.add(warmLight);

    const makeMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? .72,
      metalness: options.metalness ?? .04,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
    });

    const materials = {
      skin: makeMaterial(0xffd3bb),
      blush: makeMaterial(0xff9f98, { emissive: 0xff6b68, emissiveIntensity: .08 }),
      hair: makeMaterial(0x4a342f),
      hairLight: makeMaterial(0x6d4a43),
      shirt: makeMaterial(0xf6f3ea),
      shirtDark: makeMaterial(0x2864dc),
      gold: makeMaterial(0xe5c46a, { metalness: .12 }),
      dark: makeMaterial(0x111922),
      white: makeMaterial(0xf5f8f6),
      accent: makeMaterial(0x56f0c8, { emissive: 0x56f0c8, emissiveIntensity: .5, metalness: .12 }),
      cat: makeMaterial(0xd89650),
      catLight: makeMaterial(0xffd5a3),
      catDark: makeMaterial(0x3b2927),
      glass: makeMaterial(0x56f0c8, { emissive: 0x56f0c8, emissiveIntensity: .6, transparent: true, opacity: .42, metalness: .2 }),
    };

    const addMesh = (parent, geometry, material, position = [0,0,0], scale = [1,1,1], rotation = [0,0,0]) => {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(...position);
      object.scale.set(...scale);
      object.rotation.set(...rotation);
      parent.add(object);
      return object;
    };

    const rig = new THREE.Group();
    scene.add(rig);

    const base = new THREE.Group();
    rig.add(base);
    addMesh(base, new THREE.CylinderGeometry(2.15, 2.28, .18, 64), makeMaterial(0x13252b, { metalness: .25 }), [0,-2.42,0]);
    const ring = addMesh(base, new THREE.TorusGeometry(2.12, .035, 10, 100), materials.accent, [0,-2.3,0], [1,1,1], [Math.PI/2,0,0]);
    const innerRing = addMesh(base, new THREE.TorusGeometry(1.55, .012, 8, 80), materials.glass, [0,-2.29,0], [1,1,1], [Math.PI/2,0,0]);

    const body = new THREE.Group();
    rig.add(body);
    addMesh(body, new THREE.CapsuleGeometry(.66, 1.25, 8, 24), materials.shirt, [0,-.72,0], [1.08,1,.75]);
    addMesh(body, new THREE.CylinderGeometry(.69,.76,.16,32), materials.shirtDark, [0,-1.43,0]);
    addMesh(body, new THREE.BoxGeometry(.8,.055,.035), materials.shirtDark, [0,-1.02,.54], [1,1,1], [0,0,-.08]);
    addMesh(body, new THREE.BoxGeometry(.34,.025,.04), materials.gold, [.24,-.96,.565], [1,1,1], [0,0,-.08]);
    addMesh(body, new THREE.BoxGeometry(.035,.17,.025), materials.shirtDark, [-.12,-.65,.56]);
    addMesh(body, new THREE.TorusGeometry(.055,.014,8,18), materials.shirtDark, [.02,-.65,.57], [1,.95,1]);
    addMesh(body, new THREE.CylinderGeometry(.12,.25,.36,3), materials.white, [-.2,-.06,.57], [1,1,1], [0,0,-.15]);
    addMesh(body, new THREE.CylinderGeometry(.12,.25,.36,3), materials.white, [.2,-.06,.57], [1,1,1], [0,0,.15]);
    const sensorBadge = addMesh(body, new THREE.BoxGeometry(.26,.34,.08), materials.dark, [.38,-.45,.59], [1,1,1], [0,0,-.08]);
    addMesh(sensorBadge, new THREE.SphereGeometry(.045,12,8), materials.accent, [0,0,.58]);

    const leftArm = new THREE.Group();
    leftArm.position.set(-.72,-.22,0);
    body.add(leftArm);
    addMesh(leftArm, new THREE.CapsuleGeometry(.18,.74,6,16), materials.shirt, [0,-.48,0], [.95,1,.9], [0,0,-.08]);
    addMesh(leftArm, new THREE.SphereGeometry(.22,20,14), materials.skin, [-.05,-1.0,.02], [.95,1,.9]);

    const rightArm = new THREE.Group();
    rightArm.position.set(.72,-.22,0);
    body.add(rightArm);
    addMesh(rightArm, new THREE.CapsuleGeometry(.18,.74,6,16), materials.shirt, [0,-.48,0], [.95,1,.9], [0,0,.08]);
    const rightHand = addMesh(rightArm, new THREE.SphereGeometry(.22,20,14), materials.skin, [.05,-1.0,.02], [.95,1,.9]);

    const legs = new THREE.Group();
    body.add(legs);
    addMesh(legs, new THREE.CapsuleGeometry(.24,.64,6,18), materials.dark, [-.36,-1.85,0], [1,1,.9], [0,0,.04]);
    addMesh(legs, new THREE.CapsuleGeometry(.24,.64,6,18), materials.dark, [.36,-1.85,0], [1,1,.9], [0,0,-.04]);
    addMesh(legs, new THREE.CapsuleGeometry(.23,.2,6,16), materials.white, [-.38,-2.28,.1], [1.15,1,.9], [Math.PI/2,0,0]);
    addMesh(legs, new THREE.CapsuleGeometry(.23,.2,6,16), materials.white, [.38,-2.28,.1], [1.15,1,.9], [Math.PI/2,0,0]);

    const head = new THREE.Group();
    head.position.set(0,1.05,0);
    rig.add(head);
    addMesh(head, new THREE.SphereGeometry(1,48,32), materials.skin, [0,.2,0], [1.04,1.09,.91]);
    addMesh(head, new THREE.SphereGeometry(.12,20,14), materials.blush, [-.64,-.05,.84], [1.3,.55,.3]);
    addMesh(head, new THREE.SphereGeometry(.12,20,14), materials.blush, [.64,-.05,.84], [1.3,.55,.3]);

    const leftEye = addMesh(head, new THREE.SphereGeometry(.13,24,16), materials.dark, [-.36,.15,.86], [.78,1.15,.34]);
    const rightEye = addMesh(head, new THREE.SphereGeometry(.13,24,16), materials.dark, [.36,.15,.86], [.78,1.15,.34]);
    addMesh(leftEye, new THREE.SphereGeometry(.035,12,8), materials.white, [-.18,.25,.86], [1,1,.4]);
    addMesh(rightEye, new THREE.SphereGeometry(.035,12,8), materials.white, [-.18,.25,.86], [1,1,.4]);
    addMesh(head, new THREE.SphereGeometry(.055,16,10), materials.blush, [0,-.06,.91], [1,.75,.35]);
    addMesh(head, new THREE.TorusGeometry(.12,.024,8,24,Math.PI), materials.dark, [0,-.22,.88], [1,.7,.45], [0,0,Math.PI]);

    const hair = new THREE.Group();
    head.add(hair);
    const hairPieces = [
      [-.72,.63,.28,.52,.64,.55,-.35],[-.35,.95,.02,.55,.68,.58,-.13],[.08,1.02,.0,.58,.67,.58,.08],[.5,.86,.1,.55,.64,.56,.28],[.76,.52,.22,.45,.57,.5,.45],
      [-.82,.25,.25,.35,.56,.46,-.18],[.84,.2,.22,.34,.54,.44,.18],[-.55,-.05,.72,.35,.68,.28,-.5],[-.18,.13,.86,.38,.72,.24,-.2],[.22,.15,.86,.38,.7,.24,.2],[.57,.02,.75,.34,.62,.27,.48],
    ];
    hairPieces.forEach(([x,y,z,sx,sy,sz,rz], index) => addMesh(hair, new THREE.SphereGeometry(.72,24,16), index % 3 ? materials.hair : materials.hairLight, [x,y,z], [sx,sy,sz], [0,0,rz]));
    addMesh(hair, new THREE.SphereGeometry(1.01,40,24), materials.hair, [0,.48,-.16], [1.05,.94,.88]);

    const cat = new THREE.Group();
    cat.position.set(-1.12,-1.33,.58);
    cat.rotation.y = .22;
    rig.add(cat);
    addMesh(cat, new THREE.SphereGeometry(.48,28,20), materials.cat, [0,-.14,0], [.9,1.25,.82]);
    addMesh(cat, new THREE.SphereGeometry(.43,28,20), materials.cat, [0,.47,.03], [1,1,.88]);
    addMesh(cat, new THREE.ConeGeometry(.19,.42,4), materials.catDark, [-.25,.88,0], [1,1,.8], [0,0,-.12]);
    addMesh(cat, new THREE.ConeGeometry(.19,.42,4), materials.cat, [.25,.88,0], [1,1,.8], [0,0,.12]);
    addMesh(cat, new THREE.SphereGeometry(.2,18,12), materials.catLight, [-.25,.48,.34], [1.1,1.35,.45]);
    addMesh(cat, new THREE.SphereGeometry(.07,16,10), materials.dark, [-.16,.53,.39], [.75,1,.3]);
    addMesh(cat, new THREE.SphereGeometry(.07,16,10), materials.dark, [.16,.53,.39], [.75,1,.3]);
    addMesh(cat, new THREE.SphereGeometry(.045,12,8), materials.blush, [0,.38,.42], [1,.7,.3]);
    addMesh(cat, new THREE.CapsuleGeometry(.1,.44,5,12), materials.catLight, [-.22,-.73,.06], [.8,1,.8]);
    addMesh(cat, new THREE.CapsuleGeometry(.1,.44,5,12), materials.cat, [.22,-.73,.06], [.8,1,.8]);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(-.38,-.2,-.08);
    cat.add(tailPivot);
    const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.5,.15,0),new THREE.Vector3(-.72,.55,.1),new THREE.Vector3(-.48,.84,.15)]);
    addMesh(tailPivot, new THREE.TubeGeometry(tailCurve,24,.09,10,false), materials.catDark);

    const dataCloud = new THREE.Group();
    rig.add(dataCloud);
    const nodes = [];
    [[-2.15,.95,-.35],[1.85,1.5,-.2],[2.2,-.25,.15],[-1.95,-.6,-.1],[1.45,2.25,-.6]].forEach((position, index) => {
      const node = addMesh(dataCloud, index % 2 ? new THREE.IcosahedronGeometry(.12,1) : new THREE.SphereGeometry(.1,16,10), index % 2 ? materials.accent : materials.glass, position);
      nodes.push(node);
    });

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const targets = {
      hero: { x: .3, y: .2, scale: 1.02, ry: -.12, arm: -.12, head: 0 },
      system: { x: .65, y: .05, scale: .96, ry: -.48, arm: -1.35, head: -.12 },
      work: { x: 1.18, y: -.05, scale: .82, ry: -.75, arm: -2.0, head: -.2 },
      journey: { x: .7, y: .05, scale: .94, ry: .28, arm: -.22, head: .12 },
      beyond: { x: 1.0, y: -.15, scale: .82, ry: -.2, arm: -.7, head: -.08 },
      contact: { x: .45, y: .0, scale: .92, ry: .45, arm: -2.25, head: .15 },
    };

    let accent = new THREE.Color(scenePalette.hero);
    const scaleVector = new THREE.Vector3(1, 1, 1);
    let last = performance.now();
    const render = (now) => {
      const delta = Math.min((now - last) / 1000, .05);
      last = now;
      const time = state.paused ? 0 : now / 1000;
      const target = targets[state.scene] || targets.hero;
      const mobileShift = window.innerWidth < 820 ? .5 : 0;
      const continuousTurn = state.paused ? 0 : (state.sceneProgress - .5) * .34;
      const projectTurn = state.project === "imu" ? -.18 : 0;
      const projectArm = state.project === "muscle" ? -.22 : 0;

      rig.position.x = lerp(rig.position.x, target.x + mobileShift, .055);
      rig.position.y = lerp(rig.position.y, target.y + Math.sin(time * 1.25) * .035, .055);
      rig.rotation.y = lerp(rig.rotation.y, target.ry + continuousTurn + state.pointerX * .06 + projectTurn, .045);
      rig.rotation.x = lerp(rig.rotation.x, state.pointerY * .025, .04);
      const scaleTarget = target.scale * (window.innerWidth < 560 ? .88 : 1);
      rig.scale.lerp(scaleVector.setScalar(scaleTarget), .055);

      head.rotation.y = lerp(head.rotation.y, target.head + state.pointerX * .12, .07);
      head.rotation.x = lerp(head.rotation.x, -state.pointerY * .07, .07);
      body.rotation.z = Math.sin(time * .9) * .012;
      rightArm.rotation.z = lerp(rightArm.rotation.z, target.arm + projectArm + (state.scene === "hero" ? Math.sin(time * 2.2) * .12 : 0), .065);
      rightArm.rotation.x = Math.sin(time * 1.2) * .035;
      rightHand.rotation.y += state.paused ? 0 : delta * .8;
      leftArm.rotation.z = lerp(leftArm.rotation.z, state.scene === "work" ? .35 : .08, .06);
      tailPivot.rotation.z = Math.sin(time * 2.0) * .24;
      cat.rotation.y = .22 + Math.sin(time * .7) * .06;
      ring.rotation.z += state.paused ? 0 : delta * .22;
      innerRing.rotation.z -= state.paused ? 0 : delta * .16;
      dataCloud.rotation.y += state.paused ? 0 : delta * .08;
      nodes.forEach((node, index) => {
        node.position.y += state.paused ? 0 : Math.sin(time * 1.4 + index) * .0007;
        node.rotation.x += state.paused ? 0 : delta * (.2 + index * .03);
        node.rotation.y += state.paused ? 0 : delta * (.25 + index * .02);
      });

      const blink = state.paused ? 1 : (Math.sin(time * .72) > .985 ? .09 : 1);
      leftEye.scale.y = lerp(leftEye.scale.y, 1.15 * blink, .45);
      rightEye.scale.y = lerp(rightEye.scale.y, 1.15 * blink, .45);

      const desiredAccent = new THREE.Color(state.project ? projectPalette[state.project] : scenePalette[state.scene]);
      accent.lerp(desiredAccent, .045);
      materials.accent.color.copy(accent);
      materials.accent.emissive.copy(accent);
      materials.glass.color.copy(accent);
      materials.glass.emissive.copy(accent);
      rimLight.color.copy(accent);

      const projectGesture = state.project;
      dataCloud.rotation.z = lerp(dataCloud.rotation.z, projectGesture === "fit3d" ? Math.sin(time) * .18 : 0, .08);
      if (projectGesture === "billiards") ring.rotation.z += delta * .7;

      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    return { renderer, scene };
  } catch (error) {
    console.warn("3D avatar fallback enabled", error);
    canvas.style.display = "none";
    stage.querySelector(".stage-fallback").style.display = "block";
    return null;
  }
}

initInterface();
const drawMiniVisuals = initMiniVisuals();
initAvatar();

let visualTime = 0;
function animateVisuals(now) {
  if (!state.paused) visualTime = now / 1000;
  drawMiniVisuals(visualTime);
  requestAnimationFrame(animateVisuals);
}
requestAnimationFrame(animateVisuals);
