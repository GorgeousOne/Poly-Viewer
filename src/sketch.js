import p5 from 'p5'
import { polyData } from './main.js'
import { calcDual } from './dorman_luke.js';

const p5Holder = document.querySelector('#sketch-holder');
const polyLabel = document.querySelector('#poly-label');
const polyFaceList = document.querySelector('#poly-face-list');
const dualCheck = document.querySelector('#dual-check');
const dualBox = document.querySelector('#dual-box');

window.sketchAPI = {};

const polygonNames = {
	3: 'triangles',
	4: 'squares',
	5: 'pentagons',
	6: 'hexagons',
	8: 'octagons',
	10: 'decagons'
}

new p5((p) => {
	let t = 0;
	let loadedModels = {};
	let currentModel = '';

	p.setup = () => {
		p.createCanvas(p5Holder.clientWidth, p5Holder.clientHeight, p.WEBGL)
		p.colorMode(p.HSB, 255);
		p.strokeWeight(1);
		p.noStroke();

		Promise.all(polyData.map(d => loadPoly(d.url, d.name)))
			.then(async results => {
				for (const model of results) {
					if (model.dualMesh) {
						model.dualPGeom = await createPGeom(model.dualMesh);
					}
				}
			});

		// limit zoom factor to 0.5x-2.0x weirdly
		p._renderer.mainCamera.cameraNear = 400;
		p._renderer.mainCamera.cameraFar = 1600;
	}

	function createPGeom(mesh) {
		return p.buildGeometry(() => {
			const { vertices, faces } = mesh;
			for (const face of faces) {
				const ab = p5.Vector.sub(vertices[face[0]], vertices[face[1]]);
				const ac = p5.Vector.sub(vertices[face[2]], vertices[face[1]]);
				const normal = ac.cross(ab).normalize();

				p.beginShape();
				p.normal(normal.x, normal.y, normal.z)
				for (const fi of face) {
					const v = vertices[fi]
					p.vertex(v.x, v.y, v.z);

				}
				p.endShape(p.CLOSE);
			}
		});
	}


	p.draw = () => {
		p.background(10)
		p.orbitControl(1, 1, 1, { freeRotation: true });
		p.scale(2.5);
		placeLights();

		p.specularMaterial(10);
		p.shininess(10);

		if (currentModel in loadedModels) {
			const model = loadedModels[currentModel]
			p.noStroke();
			p.fill(model.paint);
			p.model(model.pGeom);
			drawEdges(model.mesh, 64);

			// console.log(dualCheck.checked);

			if (dualCheck.checked && model.dualPGeom) {
				p.fill(0.8 * 255);
				p.model(model.dualPGeom);
				drawEdges(model.dualMesh, 128);
			}
		} else {
			const dotty = 10;
			p.translate(-5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
		}
	}

	function drawEdges(mesh, bright) {
		p.stroke(bright, 32);
		p.beginShape(p.LINES);
		const visited = new Set();

		for (const face of mesh.faces) {
			const n = face.length;
			for (let i = 0; i < n; ++i) {
				const f0 = face[i];
				const f1 = face[(i + 1) % n];
				const str0 = `${f0},${f1}`
				const str1 = `${f0},${f1}`

				if (str0 in visited || str1 in visited) {
					continue;
				} else {
					visited.add(str0);
					visited.add(str1);
				}
				const v0 = mesh.vertices[f0];
				const v1 = mesh.vertices[f1];
				p.vertex(v0.x, v0.y, v0.z)
				p.vertex(v1.x, v1.y, v1.z);
			}
		}
		p.endShape();
	}

	p.windowResized = () => {
		p.resizeCanvas(p5Holder.clientWidth, p5Holder.clientHeight)
	}

	let lastHue = 42;
	const goldenAngle = 2 / (1 + p.sqrt(5)) * 255;

	function rngHsb() {
		lastHue = (lastHue + goldenAngle) % 255;
		return p.color(lastHue, 0.75 * 255, 0.9 * 255);
	}

	function placeLights() {
		let cam = p._renderer.mainCamera;

		// camera forward (view direction)
		let forward = p.createVector(
			cam.centerX - cam.eyeX,
			cam.centerY - cam.eyeY,
			cam.centerZ - cam.eyeZ
		);
		const focusDist = forward.mag();
		forward.normalize();

		// camera up
		let up = p.createVector(
			cam.upX,
			cam.upY,
			cam.upZ
		).normalize();

		// camera right
		let right = forward.cross(up).normalize();
		up = forward.cross(right);

		// directional light:
		// facing forward + downward 45°
		let lightDir = p5.Vector
			.add(forward, up.copy().mult(-0.5))
			.normalize();

		p.ambientLight(96);
		p.directionalLight(
			255, 0, 255,
			lightDir.x,
			lightDir.y,
			lightDir.z
		);
	}

	async function loadPoly(url, modelKey) {
		console.log('loading... ', modelKey);
		const paint = rngHsb();
		const pGeom = await p.loadModel(url);

		const [center, radius] = calcMeanBoundingSphere(pGeom);
		const targetScale = 100 / radius;
		normalizeModel(pGeom, center, targetScale);

		const faceCounts = [];
		const text = await fetch(url).then(r => r.text().then(t => t.split('\n')));
		const mesh = parseObj(text);
		normalizeModel(mesh, center, targetScale);

		for (const face of mesh.faces) {
			const faceSize = face.length;
			faceCounts[faceSize] = (faceCounts[faceSize] || 0) + 1;
		}
		const model = { url: url, pGeom: pGeom, mesh: mesh, paint: paint, faceCounts: faceCounts };

		if (hasDual(url)) {
			model.dualMesh = calcDual(p, mesh);
		}
		loadedModels[modelKey] = model;
		return model;
	}

	function hasDual(url) {
		return url.includes('platonic') || url.includes('archimedian');
	}

	function displayPoly(modelKey) {
		currentModel = modelKey;
		polyLabel.textContent = modelKey;
		polyFaceList.textContent = "lot of faces :)";

		if (currentModel in loadedModels) {
			const model = loadedModels[currentModel]
			const faceCounts = model.faceCounts;
			polyFaceList.textContent = Object.entries(faceCounts)
				.sort((a, b) => Number(a[0]) - Number(b[0]))
				.map(([size, count]) => `${count} ${polygonNames[size]}`)
				.join(', ');
			dualBox.classList.toggle('hidden', !hasDual(model.url));
		}
	}

	function calcMeanBoundingSphere(model) {
		// compute mean center
		const center = p.createVector(0, 0, 0);

		for (let i = 0; i < model.vertices.length; i++) {
			center.add(model.vertices[i]);
		}
		center.div(model.vertices.length);

		// find bounding radius
		let maxDist = 0;

		for (let i = 0; i < model.vertices.length; i++) {
			const d = center.dist(model.vertices[i]);
			maxDist = Math.max(maxDist, d);
		}
		return [center, maxDist];
	}

	function parseObj(lines) {
		const v = [];
		const f = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const tokens = line.split(/\s+/);
			const type = tokens[0];

			if (type === "v") {
				v.push(p.createVector(+tokens[1], +tokens[2], +tokens[3]));
			}
			else if (type === "f") {
				tokens.shift();
				f.push(tokens.map(t => +t.split('/')[0] - 1));
			}
		}
		return { vertices: v, faces: f };
	}

	function normalizeModel(model, center, scale) {
		for (let i = 0; i < model.vertices.length; i++) {
			model.vertices[i].sub(center);
			model.vertices[i].mult(scale);
		}
	}

	window.sketchAPI = {
		displayPoly: displayPoly,
	}
}, p5Holder)