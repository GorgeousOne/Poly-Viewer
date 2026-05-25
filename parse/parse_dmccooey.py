import re
import math

def parse_polyhedron(text: str):
	constants = {}
	vertices = []
	faces = []

	# Parse constants
	const_pattern = re.compile(r'^(C\d+)\s*=\s*([0-9eE\.\-\+]+)', re.MULTILINE)
	for name, value in const_pattern.findall(text):
		constants[name] = float(value)

	# Safe eval for coordinate expressions
	def eval_expr(expr: str):
		expr = expr.strip()

		for k, v in constants.items():
			expr = re.sub(rf'\b{k}\b', str(v), expr)

		return eval(expr, {"__builtins__": {}}, {"sqrt": math.sqrt})

	# Parse vertices
	vertex_pattern = re.compile(r'^V(\d+)\s*=\s*\((.*?)\)', re.MULTILINE)

	temp_vertices = {}

	for idx, coords in vertex_pattern.findall(text):
		parts = [eval_expr(x) for x in coords.split(",")]
		temp_vertices[int(idx)] = parts

	# Ensure ordered vertex list
	for i in range(len(temp_vertices)):
		vertices.append(temp_vertices[i])

	# Parse faces
	face_pattern = re.compile(r'\{([^\}]+)\}')
	for face in face_pattern.findall(text):
		indices = [int(x.strip()) for x in face.split(",")]
		faces.append(indices)

	return vertices, faces


def write_obj(vertices, faces, output_path):
	with open(output_path, "w") as f:
		f.write("# Generated OBJ\n")

		for v in vertices:
			f.write(f"v {v[0]} {v[1]} {v[2]}\n")

		f.write("\n")

		# OBJ uses 1-based indexing
		for face in faces:
			face_indices = [str(i + 1) for i in face]
			f.write(f"f {' '.join(face_indices)}\n")


if __name__ == "__main__":
	import argparse
	parser = argparse.ArgumentParser(description="Parse https://dmccooey.com/polyhedra definition and export OBJ")
	parser.add_argument("-i", "--input", required=True, help="Input coordinates.txt")
	args = parser.parse_args()

	with open(args.input, "r") as f:
		data = f.read()

	vertices, faces = parse_polyhedron(data)
	output = args.input.replace('txt', 'obj')
	write_obj(vertices, faces, output)

	print(f"Parsed {len(vertices)} vertices")
	print(f"Parsed {len(faces)} faces")
	print(f"OBJ written to {output}")