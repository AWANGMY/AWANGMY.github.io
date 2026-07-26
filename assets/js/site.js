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
      skin: makeMaterial(0xffd8c5),
      blush: makeMaterial(0xf29a9c, { emissive: 0xe8757b, emissiveIntensity: .06 }),
      hair: makeMaterial(0x493638),
      hairLight: makeMaterial(0x74585b),
      shirt: makeMaterial(0xaeddf0),
      shirtDark: makeMaterial(0x397fa8),
      gold: makeMaterial(0xe5c46a, { metalness: .12 }),
      dark: makeMaterial(0x211b24),
      white: makeMaterial(0xfffbf5),
      iris: makeMaterial(0x5c405f, { emissive: 0x2a1830, emissiveIntensity: .12 }),
      accent: makeMaterial(0x56f0c8, { emissive: 0x56f0c8, emissiveIntensity: .5, metalness: .12 }),
      cat: makeMaterial(0xc8894f),
      catLight: makeMaterial(0xf4d7ad),
      catDark: makeMaterial(0x4b302f),
      catPink: makeMaterial(0xe89a98),
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

    const portraitHalo = new THREE.Group();
    portraitHalo.position.set(0,.05,-1.0);
    rig.add(portraitHalo);
    const ring = addMesh(portraitHalo, new THREE.TorusGeometry(2.12,.026,10,100), materials.glass);
    const innerRing = addMesh(portraitHalo, new THREE.TorusGeometry(1.66,.012,8,90), materials.glass, [0,0,.02]);

    const body = new THREE.Group();
    body.position.y = -.12;
    rig.add(body);
    addMesh(body, new THREE.CapsuleGeometry(.76,.78,10,28), materials.shirt, [0,-1.18,0], [1.14,1,.73]);
    addMesh(body, new THREE.CylinderGeometry(.78,.86,.13,36), materials.shirtDark, [0,-1.84,0]);
    addMesh(body, new THREE.BoxGeometry(.76,.045,.035), materials.white, [0,-1.54,.61], [1,1,1], [0,0,-.07]);
    addMesh(body, new THREE.BoxGeometry(.32,.024,.04), materials.gold, [.24,-1.49,.635], [1,1,1], [0,0,-.07]);
    addMesh(body, new THREE.ConeGeometry(.23,.42,3), materials.white, [-.22,-.67,.65], [1,1,.55], [0,0,-.12]);
    addMesh(body, new THREE.ConeGeometry(.23,.42,3), materials.white, [.22,-.67,.65], [1,1,.55], [0,0,.12]);
    addMesh(body, new THREE.SphereGeometry(.04,12,8), materials.shirtDark, [0,-.92,.7], [1,1,.4]);
    addMesh(body, new THREE.SphereGeometry(.04,12,8), materials.shirtDark, [0,-1.12,.7], [1,1,.4]);

    const leftArm = new THREE.Group();
    leftArm.position.set(-.78,-.78,.08);
    leftArm.rotation.z = .67;
    body.add(leftArm);
    addMesh(leftArm, new THREE.CapsuleGeometry(.19,.65,7,18), materials.shirt, [0,-.4,.16], [1,1,.88]);
    addMesh(leftArm, new THREE.CapsuleGeometry(.17,.38,7,18), materials.skin, [0,-.87,.48], [1,1,.9]);
    addMesh(leftArm, new THREE.SphereGeometry(.2,22,16), materials.skin, [0,-1.16,.98], [1.05,.82,.86]);

    const rightArm = new THREE.Group();
    rightArm.position.set(.78,-.78,.08);
    rightArm.rotation.z = -.67;
    body.add(rightArm);
    addMesh(rightArm, new THREE.CapsuleGeometry(.19,.65,7,18), materials.shirt, [0,-.4,.16], [1,1,.88]);
    addMesh(rightArm, new THREE.CapsuleGeometry(.17,.38,7,18), materials.skin, [0,-.87,.48], [1,1,.9]);
    const rightHand = addMesh(rightArm, new THREE.SphereGeometry(.2,22,16), materials.skin, [0,-1.16,.98], [1.05,.82,.86]);

    const head = new THREE.Group();
    head.position.set(0,.62,0);
    rig.add(head);
    addMesh(head, new THREE.SphereGeometry(1.12,56,40), materials.skin, [0,.16,0], [1.04,1,.84]);
    addMesh(head, new THREE.SphereGeometry(.14,22,16), materials.blush, [-.69,-.06,.87], [1.45,.52,.25]);
    addMesh(head, new THREE.SphereGeometry(.14,22,16), materials.blush, [.69,-.06,.87], [1.45,.52,.25]);

    const buildEye = (x) => {
      const eye = new THREE.Group();
      eye.position.set(x,.22,.89);
      head.add(eye);
      addMesh(eye, new THREE.SphereGeometry(.25,28,20), materials.white, [0,0,0], [1.12,.72,.28]);
      addMesh(eye, new THREE.SphereGeometry(.145,24,16), materials.iris, [0,-.01,.115], [.86,1.08,.36]);
      addMesh(eye, new THREE.SphereGeometry(.073,20,14), materials.dark, [0,-.015,.19], [.88,1.1,.35]);
      addMesh(eye, new THREE.SphereGeometry(.037,14,10), materials.white, [-.035,.055,.225], [1,1,.45]);
      return eye;
    };
    const leftEye = buildEye(-.39);
    const rightEye = buildEye(.39);
    addMesh(head, new THREE.BoxGeometry(.24,.035,.025), materials.hair, [-.39,.51,.94], [1,1,.7], [0,0,-.08]);
    addMesh(head, new THREE.BoxGeometry(.24,.035,.025), materials.hair, [.39,.51,.94], [1,1,.7], [0,0,.08]);
    addMesh(head, new THREE.ConeGeometry(.065,.105,3), materials.catPink, [0,-.075,.96], [1,.7,.55], [0,0,Math.PI]);
    addMesh(head, new THREE.TorusGeometry(.115,.018,7,24,Math.PI), materials.dark, [0,-.18,.93], [1,.74,.45], [0,0,Math.PI]);
    addMesh(head, new THREE.SphereGeometry(.07,16,10), materials.catPink, [0,-.28,.935], [1.15,.62,.28]);
    addMesh(head, new THREE.ConeGeometry(.04,.1,3), materials.white, [.105,-.22,.955], [1,1,.55], [0,0,Math.PI]);

    const hair = new THREE.Group();
    head.add(hair);
    addMesh(hair, new THREE.SphereGeometry(1.16,48,32), materials.hair, [0,.45,-.18], [1.08,1.02,.87]);
    addMesh(hair, new THREE.ConeGeometry(.25,.58,9), materials.hair, [-.96,.78,-.06], [1,1,.68], [0,0,1.04]);
    addMesh(hair, new THREE.ConeGeometry(.25,.58,9), materials.hair, [.96,.78,-.06], [1,1,.68], [0,0,-1.04]);
    addMesh(hair, new THREE.ConeGeometry(.24,.56,9), materials.hairLight, [-.48,1.32,-.08], [1,1,.7], [0,0,.22]);
    addMesh(hair, new THREE.ConeGeometry(.24,.56,9), materials.hair, [.42,1.34,-.08], [1,1,.7], [0,0,-.2]);
    const sideLocks = [
      [-.96,.18,.14,.36,.77,.55,.28],[.96,.18,.14,.36,.77,.55,-.28],
      [-.84,-.18,.3,.28,.57,.42,.5],[.84,-.18,.3,.28,.57,.42,-.5],
      [-.66,.91,.0,.48,.5,.55,-.42],[.68,.92,.0,.48,.5,.55,.42],
    ];
    sideLocks.forEach(([x,y,z,sx,sy,sz,rz], index) => addMesh(hair, new THREE.SphereGeometry(.7,26,18), index === 4 ? materials.hairLight : materials.hair, [x,y,z], [sx,sy,sz], [0,0,rz]));
    const bangs = [
      [-.59,.69,.92,.54,.7,-.22],[-.3,.74,.95,.58,.78,-.09],[.02,.76,.96,.6,.82,.04],[.34,.73,.95,.56,.76,.13],[.62,.68,.91,.52,.68,.23],
    ];
    bangs.forEach(([x,y,z,sx,sy,tilt], index) => addMesh(hair, new THREE.SphereGeometry(.52,26,18), index === 2 ? materials.hairLight : materials.hair, [x,y,z], [sx,sy,.18], [0,0,tilt]));
    addMesh(hair, new THREE.ConeGeometry(.25,.72,6), materials.hair, [-.9,.52,.43], [1,1,.7], [0,0,Math.PI-.48]);
    addMesh(hair, new THREE.ConeGeometry(.25,.72,6), materials.hair, [.9,.52,.43], [1,1,.7], [0,0,Math.PI+.48]);

    const cat = new THREE.Group();
    cat.position.set(0,-1.08,.86);
    cat.rotation.y = .04;
    rig.add(cat);
    addMesh(cat, new THREE.SphereGeometry(.5,32,24), materials.catLight, [0,-.34,0], [.78,1.06,.67]);
    addMesh(cat, new THREE.SphereGeometry(.48,34,24), materials.catLight, [0,.24,.04], [1.02,.9,.76]);
    addMesh(cat, new THREE.ConeGeometry(.21,.42,4), materials.cat, [-.28,.69,.02], [1,1,.72], [0,0,-.15]);
    addMesh(cat, new THREE.ConeGeometry(.21,.42,4), materials.catDark, [.28,.69,.02], [1,1,.72], [0,0,.15]);
    addMesh(cat, new THREE.ConeGeometry(.105,.25,4), materials.catPink, [-.28,.7,.08], [1,1,.72], [0,0,-.15]);
    addMesh(cat, new THREE.ConeGeometry(.105,.25,4), materials.catPink, [.28,.7,.08], [1,1,.72], [0,0,.15]);
    addMesh(cat, new THREE.SphereGeometry(.25,22,16), materials.cat, [-.27,.32,.33], [1.18,1.35,.32]);
    addMesh(cat, new THREE.SphereGeometry(.19,20,14), materials.catDark, [.27,.36,.35], [1.05,1.22,.28]);
    addMesh(cat, new THREE.TorusGeometry(.085,.014,6,18,Math.PI), materials.dark, [-.16,.22,.405], [1,.72,.45], [0,0,Math.PI]);
    addMesh(cat, new THREE.TorusGeometry(.085,.014,6,18,Math.PI), materials.dark, [.16,.22,.405], [1,.72,.45], [0,0,Math.PI]);
    addMesh(cat, new THREE.SphereGeometry(.14,18,12), materials.white, [-.1,.08,.39], [1.1,.72,.35]);
    addMesh(cat, new THREE.SphereGeometry(.14,18,12), materials.white, [.1,.08,.39], [1.1,.72,.35]);
    addMesh(cat, new THREE.ConeGeometry(.045,.075,3), materials.catPink, [0,.11,.45], [1,.7,.45], [0,0,Math.PI]);
    addMesh(cat, new THREE.SphereGeometry(.07,16,10), materials.catPink, [0,-.04,.44], [1,.65,.3]);
    addMesh(cat, new THREE.CapsuleGeometry(.105,.26,6,14), materials.catLight, [-.27,-.55,.32], [1,1,.8], [0,0,-.4]);
    addMesh(cat, new THREE.CapsuleGeometry(.105,.26,6,14), materials.cat, [.27,-.55,.32], [1,1,.8], [0,0,.4]);
    addMesh(cat, new THREE.SphereGeometry(.13,18,12), materials.catLight, [-.31,-.76,.37], [1.1,.78,.72]);
    addMesh(cat, new THREE.SphereGeometry(.13,18,12), materials.cat, [.31,-.76,.37], [1.1,.78,.72]);
    addMesh(cat, new THREE.SphereGeometry(.17,22,16), materials.skin, [-.43,-.39,.48], [1.08,.82,.72], [0,0,-.18]);
    addMesh(cat, new THREE.SphereGeometry(.17,22,16), materials.skin, [.43,-.39,.48], [1.08,.82,.72], [0,0,.18]);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(.32,-.48,-.06);
    cat.add(tailPivot);
    const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.5,.08,0),new THREE.Vector3(.68,.48,.08),new THREE.Vector3(.48,.76,.14)]);
    addMesh(tailPivot, new THREE.TubeGeometry(tailCurve,28,.1,12,false), materials.catDark);

    const dataCloud = new THREE.Group();
    rig.add(dataCloud);
    const nodes = [];

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const targets = {
      hero: { x: .2, y: .05, scale: 1.03, ry: -.05, arm: -.67, head: 0 },
      system: { x: .55, y: .02, scale: .97, ry: -.24, arm: -.7, head: -.06 },
      work: { x: .98, y: -.03, scale: .88, ry: -.42, arm: -.73, head: -.1 },
      journey: { x: .62, y: .02, scale: .96, ry: .16, arm: -.68, head: .07 },
      beyond: { x: .86, y: -.05, scale: .9, ry: -.12, arm: -.7, head: -.04 },
      contact: { x: .42, y: 0, scale: .95, ry: .26, arm: -.7, head: .08 },
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
      const continuousTurn = state.paused ? 0 : (state.sceneProgress - .5) * .15;
      const projectTurn = state.project === "imu" ? -.08 : 0;
      const projectArm = state.project === "muscle" ? -.08 : 0;

      rig.position.x = lerp(rig.position.x, target.x + mobileShift, .055);
      rig.position.y = lerp(rig.position.y, target.y + Math.sin(time * 1.25) * .035, .055);
      rig.rotation.y = lerp(rig.rotation.y, target.ry + continuousTurn + state.pointerX * .06 + projectTurn, .045);
      rig.rotation.x = lerp(rig.rotation.x, state.pointerY * .025, .04);
      const scaleTarget = target.scale * (window.innerWidth < 560 ? .88 : 1);
      rig.scale.lerp(scaleVector.setScalar(scaleTarget), .055);

      head.rotation.y = lerp(head.rotation.y, target.head + state.pointerX * .12, .07);
      head.rotation.x = lerp(head.rotation.x, -state.pointerY * .07, .07);
      body.rotation.z = Math.sin(time * .9) * .008;
      rightArm.rotation.z = lerp(rightArm.rotation.z, target.arm + projectArm, .065);
      rightArm.rotation.x = Math.sin(time * 1.2) * .018;
      rightHand.rotation.z = Math.sin(time * 1.4) * .025;
      leftArm.rotation.z = lerp(leftArm.rotation.z, -target.arm - projectArm, .065);
      tailPivot.rotation.z = Math.sin(time * 1.8) * .18;
      cat.position.y = -1.08 + Math.sin(time * 1.1) * .014;
      cat.rotation.y = .04 + Math.sin(time * .7) * .025;
      cat.rotation.z = Math.sin(time * .8) * .008;
      ring.rotation.z += state.paused ? 0 : delta * .22;
      innerRing.rotation.z -= state.paused ? 0 : delta * .16;
      dataCloud.rotation.y += state.paused ? 0 : delta * .08;
      nodes.forEach((node, index) => {
        node.position.y += state.paused ? 0 : Math.sin(time * 1.4 + index) * .0007;
        node.rotation.x += state.paused ? 0 : delta * (.2 + index * .03);
        node.rotation.y += state.paused ? 0 : delta * (.25 + index * .02);
      });

      const blink = state.paused ? 1 : (Math.sin(time * .72) > .985 ? .1 : 1);
      leftEye.scale.y = lerp(leftEye.scale.y, blink, .45);
      rightEye.scale.y = lerp(rightEye.scale.y, blink, .45);

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
