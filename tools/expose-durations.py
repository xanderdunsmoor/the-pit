# Exposes Kokoro's per-sound durations so the voice script can time mouth shapes exactly.
import onnx, sys
from onnx import helper, TensorProto
m = onnx.load(sys.argv[1])
m.graph.node.append(helper.make_node("Identity", ["/encoder/Round_output_0"], ["duration"], name="expose_duration"))
m.graph.output.append(helper.make_tensor_value_info("duration", TensorProto.FLOAT, None))
onnx.save(m, sys.argv[2])
