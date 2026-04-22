package main

workload {
	input.kind == "Deployment"
}

workload {
	input.kind == "StatefulSet"
}

workload {
	input.kind == "DaemonSet"
}

deny[msg] {
	workload
	pod_spec := object.get(object.get(object.get(input, "spec", {}), "template", {}), "spec", {})
	pod_secctx := object.get(pod_spec, "securityContext", {})
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(pod_secctx, "runAsNonRoot", false)
	not object.get(object.get(c, "securityContext", {}), "runAsNonRoot", false)
	msg := sprintf("Container '%s' must run as non-root (securityContext.runAsNonRoot required)", [c.name])
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(object.get(c, "securityContext", {}), "capabilities", null)
	msg := sprintf("Container '%s' must drop capabilities (securityContext.capabilities.drop required)", [c.name])
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not has_all_drop(c)
	msg := sprintf("Container '%s' must drop ALL capabilities", [c.name])
}

has_all_drop(c) {
	drop := object.get(object.get(object.get(c, "securityContext", {}), "capabilities", {}), "drop", [])
	drop[_] == "ALL"
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(object.get(c, "resources", {}), "requests", null)
	msg := sprintf("Container '%s' must define resource requests", [c.name])
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(object.get(c, "resources", {}), "limits", null)
	msg := sprintf("Container '%s' must define resource limits", [c.name])
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(c, "livenessProbe", null)
	msg := sprintf("Container '%s' must have a livenessProbe", [c.name])
}

deny[msg] {
	workload
	some i
	c := input.spec.template.spec.containers[i]
	not object.get(c, "readinessProbe", null)
	msg := sprintf("Container '%s' must have a readinessProbe", [c.name])
}

deny[msg] {
	input.kind == "Service"
	input.spec.type == "LoadBalancer"
	msg := sprintf("Service '%s' must not use type LoadBalancer", [input.metadata.name])
}
