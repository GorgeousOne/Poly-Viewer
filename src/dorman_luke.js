import p5 from 'p5';

export function calcDual(p, mesh) {
	const vs = mesh.vertices;
	const fs = mesh.faces;
	const origin = p.createVector(0, 0, 0);

	for (const v of vs) {
		origin.add(v);
	}
	origin.div(vs.length);

	// edge graph
	const edges = Array.from({ length: vs.length }, () => new Set());

	for (const face of fs) {
		const n = face.length;

		for (let i = 0; i < n; i++) {
			const a = face[i];
			const b = face[(i + 1) % n];

			edges[a].add(b);
			edges[b].add(a);
		}
	}

	function getAngle(a, o, b) {
		const va = p5.Vector.sub(a, o).normalize();
		const vb = p5.Vector.sub(b, o).normalize();
		const dot = p.constrain(va.dot(vb), -1, 1);
		return Math.acos(dot);
	}

	function sortConvex(verts, normal) {
		verts = [...verts];
		const center = p.createVector(0, 0, 0);

		for (const v of verts) {
			center.add(v);
		}
		center.div(verts.length);
		normal.normalize();

		const xaxis = normal.cross(p5.Vector.sub(verts[0], center)).normalize();
		const yaxis = normal.cross(xaxis).normalize();

		verts.sort((a, b) => {
			const da = p5.Vector.sub(a, center);
			const db = p5.Vector.sub(b, center);

			const aa = Math.atan2(
				da.dot(yaxis),
				da.dot(xaxis)
			);

			const ab = Math.atan2(
				db.dot(yaxis),
				db.dot(xaxis)
			);

			return aa - ab;
		});

		return verts;
	}

	function circumcenter(a, b, c) {
		const ab = p5.Vector.sub(b, a);
		const ac = p5.Vector.sub(c, a);
		const abXac = ab.cross(ac);
		const denom = 2 * abXac.dot(abXac);

		const term1 = abXac.cross(ab).mult(ac.dot(ac));
		const term2 = ac.cross(abXac).mult(ab.dot(ab));
		return p5.Vector.add(a, p5.Vector.add(term1, term2).div(denom));
	}

	const dualFaces = [];

	for (let e0 = 0; e0 < edges.length; e0++) {
		const up = p5.Vector.sub(vs[e0], origin).normalize();
		let edgeMids = [];

		for (const e1 of edges[e0]) {
			edgeMids.push(p5.Vector.add(vs[e0], vs[e1]).mult(0.5));
		}
		edgeMids = sortConvex(edgeMids, up);

		const center = circumcenter(
			edgeMids[0],
			edgeMids[1],
			edgeMids[2]
		);
		const radius = p5.Vector.dist(edgeMids[0], center);
		const newFace = [];

		for (let i = 0; i < edgeMids.length; i++) {
			const v0 = edgeMids[i];
			const v1 = edgeMids[(i + 1) % edgeMids.length];
			const phi = getAngle(v0, center, v1);

			const a = p5.Vector.sub(v0, center);
			const b = p5.Vector.sub(v1, center);

			const d = p5.Vector.add(a, b).normalize()
			const p = p5.Vector.add(center, d.mult(radius / Math.cos(phi * 0.5))
			);
			newFace.push(p);
		}
		dualFaces.push(newFace);
	}

	// build global mesh
	const outVertices = [];
	const outFaces = [];

	for (const face of dualFaces) {
		const inds = [];

		for (const v of face) {
			inds.push(outVertices.length);
			outVertices.push(v);
		}
		outFaces.push(inds);
	}
	return {
		vertices: outVertices,
		faces: outFaces
	};
}