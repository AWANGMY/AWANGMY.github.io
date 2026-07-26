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
      skin: makeMaterial(0xf1c5a8),
      skinShade: makeMaterial(0xdca88a),
      blush: makeMaterial(0xe98f91, { emissive: 0xc86469, emissiveIntensity: .04 }),
      hair: makeMaterial(0x282326),
      hairLight: makeMaterial(0x46363a),
      shirt: makeMaterial(0xb9dce9),
      shirtDark: makeMaterial(0x3b88ac),
      gold: makeMaterial(0xe5c46a, { metalness: .12 }),
      dark: makeMaterial(0x211b24),
      white: makeMaterial(0xfffbf5),
      iris: makeMaterial(0x3d3032, { emissive: 0x241b1d, emissiveIntensity: .08 }),
      accent: makeMaterial(0x56f0c8, { emissive: 0x56f0c8, emissiveIntensity: .5, metalness: .12 }),
      cat: makeMaterial(0xd99a53),
      catLight: makeMaterial(0xf3dfbd),
      catCream: makeMaterial(0xfff3da),
      catDark: makeMaterial(0x543b3a),
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

    const addTube = (parent, points, radius, material, segments = 24) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
      return addMesh(parent, new THREE.TubeGeometry(curve, segments, radius, 10, false), material);
    };

    const rig = new THREE.Group();
    scene.add(rig);

    const portraitHalo = new THREE.Group();
    portraitHalo.position.set(0,.05,-1.0);
    rig.add(portraitHalo);
    const ring = addMesh(portraitHalo, new THREE.TorusGeometry(2.12,.026,10,100), materials.glass);
    const innerRing = addMesh(portraitHalo, new THREE.TorusGeometry(1.66,.012,8,90), materials.glass, [0,0,.02]);

    const body = new THREE.Group();
    body.position.y = -.08;
    rig.add(body);
    addMesh(body, new THREE.CapsuleGeometry(.62,.66,10,28), materials.shirt, [0,-1.13,0], [1.18,1.03,.72]);
    addMesh(body, new THREE.SphereGeometry(.66,32,22), materials.shirt, [0,-.72,.02], [1.2,.62,.73]);
    addMesh(body, new THREE.CylinderGeometry(.68,.75,.12,36), materials.shirtDark, [0,-1.89,0]);
    addMesh(body, new THREE.CylinderGeometry(.17,.19,.28,24), materials.skinShade, [0,-.24,-.02], [1,1,.9]);
    addMesh(body, new THREE.ConeGeometry(.2,.38,3), materials.white, [-.2,-.49,.59], [1,1,.6], [0,0,-.12]);
    addMesh(body, new THREE.ConeGeometry(.2,.38,3), materials.white, [.2,-.49,.59], [1,1,.6], [0,0,.12]);
    addMesh(body, new THREE.SphereGeometry(.035,12,8), materials.shirtDark, [0,-.82,.69], [1,1,.4]);
    addMesh(body, new THREE.SphereGeometry(.035,12,8), materials.shirtDark, [0,-1.04,.7], [1,1,.4]);

    const leftArm = new THREE.Group();
    leftArm.position.set(-.62,-.58,.04);
    body.add(leftArm);
    addTube(leftArm, [[0,0,0],[-.14,-.17,.1],[-.24,-.36,.24]], .18, materials.shirt, 20);
    addTube(leftArm, [[-.24,-.36,.24],[-.23,-.56,.47],[.08,-.75,.72]], .13, materials.skin, 20);
    addMesh(leftArm, new THREE.SphereGeometry(.18,22,16), materials.skin, [.11,-.77,.79], [1.06,.76,.66], [0,0,-.28]);

    const rightArm = new THREE.Group();
    rightArm.position.set(.62,-.58,.04);
    body.add(rightArm);
    addTube(rightArm, [[0,0,0],[.14,-.17,.1],[.24,-.36,.24]], .18, materials.shirt, 20);
    addTube(rightArm, [[.24,-.36,.24],[.23,-.56,.47],[-.08,-.75,.72]], .13, materials.skin, 20);
    const rightHand = addMesh(rightArm, new THREE.SphereGeometry(.18,22,16), materials.skin, [-.11,-.77,.79], [1.06,.76,.66], [0,0,.28]);

    const head = new THREE.Group();
    head.position.set(0,.67,0);
    rig.add(head);
    addMesh(head, new THREE.SphereGeometry(.94,52,38), materials.skin, [0,.14,0], [1,1.05,.84]);
    addMesh(head, new THREE.SphereGeometry(.12,20,14), materials.skinShade, [-.91,.14,-.01], [.65,1,.62]);
    addMesh(head, new THREE.SphereGeometry(.12,20,14), materials.skinShade, [.91,.14,-.01], [.65,1,.62]);
    addMesh(head, new THREE.SphereGeometry(.11,20,14), materials.blush, [-.58,-.07,.78], [1.25,.42,.2]);
    addMesh(head, new THREE.SphereGeometry(.11,20,14), materials.blush, [.58,-.07,.78], [1.25,.42,.2]);

    const buildEye = (x) => {
      const eye = new THREE.Group();
      eye.position.set(x,.22,.79);
      head.add(eye);
      addMesh(eye, new THREE.SphereGeometry(.17,26,18), materials.white, [0,0,0], [1.14,.72,.24]);
      addMesh(eye, new THREE.SphereGeometry(.105,22,16), materials.iris, [0,-.012,.105], [.84,1.04,.3]);
      addMesh(eye, new THREE.SphereGeometry(.05,18,12), materials.dark, [0,-.012,.155], [.86,1.05,.28]);
      addMesh(eye, new THREE.SphereGeometry(.024,12,8), materials.white, [-.022,.036,.183], [1,1,.38]);
      return eye;
    };
    const leftEye = buildEye(-.31);
    const rightEye = buildEye(.31);
    addMesh(head, new THREE.CapsuleGeometry(.016,.16,4,10), materials.hair, [-.31,.47,.81], [1,1,.55], [0,0,Math.PI / 2 - .1]);
    addMesh(head, new THREE.CapsuleGeometry(.016,.16,4,10), materials.hair, [.31,.47,.81], [1,1,.55], [0,0,Math.PI / 2 + .1]);
    addMesh(head, new THREE.SphereGeometry(.045,14,10), materials.skinShade, [0,.04,.84], [.75,1.1,.35]);
    addMesh(head, new THREE.TorusGeometry(.105,.016,7,24,Math.PI), materials.dark, [0,-.14,.81], [1,.74,.42], [0,0,Math.PI]);

    const hair = new THREE.Group();
    head.add(hair);
    addMesh(hair, new THREE.SphereGeometry(.98,42,30), materials.hair, [0,.52,-.18], [1.04,.94,.87]);
    const curls = [
      [-.72,.92,.05,.34,.4,.5,-.34],[-.42,1.18,.02,.42,.4,.48,-.18],[-.08,1.29,-.01,.43,.39,.46,.08],
      [.27,1.24,-.02,.42,.39,.47,.18],[.6,1.07,.0,.4,.42,.49,.32],[.82,.76,.02,.32,.48,.45,.28],
      [-.86,.55,.02,.3,.5,.42,.18],[.9,.43,.03,.29,.52,.42,-.18],[-.75,.25,.18,.26,.45,.36,.32],[.77,.18,.2,.25,.45,.36,-.32],
    ];
    curls.forEach(([x,y,z,sx,sy,sz,rz], index) => addMesh(hair, new THREE.SphereGeometry(.55,24,17), index === 2 || index === 5 ? materials.hairLight : materials.hair, [x,y,z], [sx,sy,sz], [0,0,rz]));
    const bangs = [
      [-.53,.76,.72,.34,.48,-.28],[-.22,.87,.77,.39,.52,-.1],[.13,.87,.77,.38,.5,.1],[.46,.77,.72,.33,.46,.28],
    ];
    bangs.forEach(([x,y,z,sx,sy,tilt], index) => addMesh(hair, new THREE.SphereGeometry(.48,24,17), index === 1 ? materials.hairLight : materials.hair, [x,y,z], [sx,sy,.16], [0,0,tilt]));
    addMesh(hair, new THREE.ConeGeometry(.18,.5,7), materials.hair, [-.84,.78,.08], [1,1,.7], [0,0,1.05]);
    addMesh(hair, new THREE.ConeGeometry(.16,.46,7), materials.hairLight, [.73,1.08,.02], [1,1,.7], [0,0,-.8]);
    addMesh(hair, new THREE.ConeGeometry(.14,.38,7), materials.hair, [-.18,1.43,-.02], [1,1,.7], [0,0,-.25]);

    const cat = new THREE.Group();
    cat.position.set(0,-1.04,.86);
    cat.rotation.y = .04;
    rig.add(cat);
    addMesh(cat, new THREE.SphereGeometry(.53,34,24), materials.catLight, [0,-.34,0], [.75,1.12,.66]);
    addMesh(cat, new THREE.SphereGeometry(.38,28,20), materials.catCream, [0,-.42,.36], [.64,1,.18]);
    addMesh(cat, new THREE.SphereGeometry(.28,24,18), materials.catLight, [-.29,-.56,.02], [1,.8,.74]);
    addMesh(cat, new THREE.SphereGeometry(.28,24,18), materials.cat, [.29,-.56,.02], [1,.8,.74]);
    addMesh(cat, new THREE.SphereGeometry(.47,36,26), materials.catLight, [0,.25,.05], [1.06,.88,.76]);
    addMesh(cat, new THREE.SphereGeometry(.19,20,14), materials.catLight, [-.23,.13,.32], [1.05,.86,.48]);
    addMesh(cat, new THREE.SphereGeometry(.19,20,14), materials.catLight, [.23,.13,.32], [1.05,.86,.48]);
    addMesh(cat, new THREE.ConeGeometry(.2,.4,3), materials.cat, [-.29,.65,.03], [1,1,.78], [0,0,-.13]);
    addMesh(cat, new THREE.ConeGeometry(.2,.4,3), materials.catDark, [.29,.65,.03], [1,1,.78], [0,0,.13]);
    addMesh(cat, new THREE.ConeGeometry(.095,.23,3), materials.catPink, [-.29,.66,.1], [1,1,.7], [0,0,-.13]);
    addMesh(cat, new THREE.ConeGeometry(.095,.23,3), materials.catPink, [.29,.66,.1], [1,1,.7], [0,0,.13]);
    addMesh(cat, new THREE.SphereGeometry(.27,24,18), materials.cat, [-.25,.36,.3], [1.05,1.2,.3], [0,0,-.14]);
    addMesh(cat, new THREE.SphereGeometry(.19,22,16), materials.catDark, [.3,.39,.32], [1,1.14,.28], [0,0,.12]);
    addTube(cat, [[-.27,.22,.43],[-.17,.18,.46],[-.08,.2,.45]], .014, materials.dark, 12);
    addTube(cat, [[.27,.22,.43],[.17,.18,.46],[.08,.2,.45]], .014, materials.dark, 12);
    addMesh(cat, new THREE.SphereGeometry(.135,18,12), materials.catCream, [-.105,.08,.42], [1.08,.72,.34]);
    addMesh(cat, new THREE.SphereGeometry(.135,18,12), materials.catCream, [.105,.08,.42], [1.08,.72,.34]);
    addMesh(cat, new THREE.ConeGeometry(.042,.07,3), materials.catPink, [0,.115,.47], [1,.72,.5], [0,0,Math.PI]);
    addMesh(cat, new THREE.TorusGeometry(.052,.011,6,18,Math.PI), materials.dark, [0,.01,.455], [1,.8,.45], [0,0,Math.PI]);
    addMesh(cat, new THREE.SphereGeometry(.045,14,10), materials.catPink, [0,-.055,.46], [1.15,.58,.28]);
    [[-.12,.08,.43,-.43,.04,.42],[-.12,.02,.43,-.45,-.04,.4],[-.12,-.04,.42,-.41,-.11,.38],
     [.12,.08,.43,.43,.04,.42],[.12,.02,.43,.45,-.04,.4],[.12,-.04,.42,.41,-.11,.38]].forEach(([x1,y1,z1,x2,y2,z2]) =>
      addTube(cat, [[x1,y1,z1],[(x1+x2)*.52,(y1+y2)*.52,z1+.012],[x2,y2,z2]], .0045, materials.dark, 10));
    addMesh(cat, new THREE.CapsuleGeometry(.09,.28,6,14), materials.catLight, [-.21,-.34,.32], [1,1,.82], [0,0,-.1]);
    addMesh(cat, new THREE.CapsuleGeometry(.09,.3,6,14), materials.cat, [.2,-.32,.32], [1,1,.82], [0,0,.23]);
    addMesh(cat, new THREE.SphereGeometry(.12,18,12), materials.catLight, [-.23,-.53,.37], [1.18,.72,.76], [0,0,-.08]);
    addMesh(cat, new THREE.SphereGeometry(.12,18,12), materials.cat, [.24,-.51,.37], [1.18,.72,.76], [0,0,.12]);
    addMesh(cat, new THREE.SphereGeometry(.15,20,14), materials.catCream, [-.23,-.78,.34], [1.15,.72,.82], [0,0,-.08]);
    addMesh(cat, new THREE.SphereGeometry(.15,20,14), materials.cat, [.25,-.75,.34], [1.15,.72,.82], [0,0,.1]);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(.3,-.52,-.05);
    cat.add(tailPivot);
    addTube(tailPivot, [[0,0,0],[.45,.04,.01],[.62,.37,.08],[.48,.69,.14],[.25,.74,.18]], .085, materials.catDark, 30);

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
      hero: { x: .2, y: .05, scale: 1.03, ry: -.05, arm: 0, head: 0 },
      system: { x: .55, y: .02, scale: .97, ry: -.24, arm: -.02, head: -.06 },
      work: { x: .98, y: -.03, scale: .88, ry: -.42, arm: -.035, head: -.1 },
      journey: { x: .62, y: .02, scale: .96, ry: .16, arm: .015, head: .07 },
      beyond: { x: .86, y: -.05, scale: .9, ry: -.12, arm: -.015, head: -.04 },
      contact: { x: .42, y: 0, scale: .95, ry: .26, arm: .02, head: .08 },
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
      const projectArm = state.project === "muscle" ? -.018 : 0;

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
      cat.position.y = -1.04 + Math.sin(time * 1.1) * .014;
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
