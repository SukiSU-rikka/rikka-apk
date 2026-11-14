package cn.hanayomi.glass;

/** 与 Compose spring(dampingRatio, stiffness, visibilityThreshold) 等价的阻尼弹簧（质量 = 1）。 */
final class Spring {
    float value, velocity, target;
    float damping, stiffness, threshold;

    Spring(float v, float dampingRatio, float stiffness, float threshold) {
        value = target = v; set(dampingRatio, stiffness); this.threshold = threshold;
    }
    void set(float dampingRatio, float stiffness) { this.damping = dampingRatio; this.stiffness = stiffness; }
    void snap(float v) { value = target = v; velocity = 0f; }
    boolean idle() { return Math.abs(value - target) < threshold && Math.abs(velocity) < threshold * 10f; }

    /** 推进 dt 秒；小步长半隐式欧拉，刚度 1000 时也稳定。返回是否仍在运动。 */
    boolean step(float dt) {
        if (idle()) { value = target; velocity = 0f; return false; }
        float c = 2f * damping * (float) Math.sqrt(stiffness);
        int n = Math.max(1, (int) Math.ceil(dt / 0.002f));
        float h = dt / n;
        for (int i = 0; i < n; i++) {
            float a = -stiffness * (value - target) - c * velocity;
            velocity += a * h;
            value += velocity * h;
        }
        return true;
    }
}
