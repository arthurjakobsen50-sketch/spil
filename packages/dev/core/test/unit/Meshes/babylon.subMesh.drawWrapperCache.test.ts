import { Engine, NullEngine } from "core/Engines";
import { MaterialDefines, MultiMaterial, StandardMaterial } from "core/Materials";
import { Mesh, SubMesh } from "core/Meshes";
import { MeshBuilder } from "core/Meshes/meshBuilder";
import { Scene } from "core/scene";
import { beforeEach, describe, expect, it } from "vitest";

describe("Babylon SubMesh DrawWrapper Cache", () => {
    let subject: Engine;
    let scene: Scene;
    let mesh: Mesh;
    let subMesh: SubMesh;
    let passZeroId: number;
    let passOneId: number;
    let passZeroMaterial: MultiMaterial;
    let passOneMaterial: MultiMaterial;
    let passZeroSubMaterial: StandardMaterial;
    let passOneSubMaterial: StandardMaterial;

    beforeEach(async function () {
        subject = new NullEngine({
            renderHeight: 256,
            renderWidth: 256,
            textureSize: 256,
            deterministicLockstep: false,
            lockstepMaxSteps: 1,
        });
        scene = new Scene(subject);

        passZeroId = subject.createRenderPassId("passZero");
        passOneId = subject.createRenderPassId("passOne");

        passZeroMaterial = new MultiMaterial("MultiMaterialZero", scene);
        passZeroSubMaterial = new StandardMaterial("StandardMaterialZero", scene);
        passZeroMaterial.subMaterials.push(passZeroSubMaterial);

        passOneMaterial = new MultiMaterial("MultiMaterialOne", scene);
        passOneSubMaterial = new StandardMaterial("StandardMaterialOne", scene);
        passOneMaterial.subMaterials.push(passOneSubMaterial);

        mesh = MeshBuilder.CreateBox("mesh", { size: 1 }, scene);
        subMesh = new SubMesh(0, 0, 0, 0, 0, mesh);
        mesh.setMaterialForRenderPass(passZeroId, passZeroMaterial);
        mesh.setMaterialForRenderPass(passOneId, passOneMaterial);
    });

    it("Inactive Pass Dirty", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        subject.currentRenderPassId = passOneId;
        expect(subMesh.getMaterial()).toBe(passOneSubMaterial);
        await passOneMaterial.forceCompilationAsync(mesh);
        expect(passOneMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subject.currentRenderPassId).toBe(passOneId);
        passZeroSubMaterial.disableLighting = true;
        expect((subMesh._drawWrappers[passZeroId].defines as MaterialDefines)._areLightsDirty).toBe(true);
    });
    it("Frozen Material Dirty", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        subject.currentRenderPassId = passOneId;
        expect(subMesh.getMaterial()).toBe(passOneSubMaterial);
        await passOneMaterial.forceCompilationAsync(mesh);
        expect(passOneMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subject.currentRenderPassId).toBe(passOneId);
        expect(subMesh._drawWrappers[passZeroId]._wasPreviouslyReady).toBe(true);
        passZeroSubMaterial.freeze();
        expect(subMesh._drawWrappers[passZeroId]._wasPreviouslyReady).toBe(false);
    });
    it("Mark Dirty", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        subject.currentRenderPassId = passOneId;
        expect(subMesh.getMaterial()).toBe(passOneSubMaterial);
        await passOneMaterial.forceCompilationAsync(mesh);
        expect(passOneMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subject.currentRenderPassId).toBe(passOneId);
        expect((subMesh._drawWrappers[passZeroId].defines as MaterialDefines).isDirty).toBe(false);
        passZeroSubMaterial.markDirty(true);
        expect((subMesh._drawWrappers[passZeroId].defines as MaterialDefines).isDirty).toBe(true);
    });
    it("Replace SubMaterial", () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);

        const replacementMaterial = new StandardMaterial("StandardMaterial", scene);
        passZeroMaterial.subMaterials[0] = replacementMaterial;
        expect(subMesh.getMaterial()).toBe(replacementMaterial);
    });
    it("Replace Pass Material", () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);

        const replacementMultiMaterial = new MultiMaterial("MultiMaterial", scene);
        const replacementSubMaterial = new StandardMaterial("StandardMaterial", scene);
        replacementMultiMaterial.subMaterials.push(replacementSubMaterial);
        mesh.setMaterialForRenderPass(passZeroId, replacementMultiMaterial);
        expect(subMesh.getMaterial()).toBe(replacementSubMaterial);
    });
    it("Scoped Reset", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        subject.currentRenderPassId = passOneId;
        expect(subMesh.getMaterial()).toBe(passOneSubMaterial);
        await passOneMaterial.forceCompilationAsync(mesh);
        expect(passOneMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subMesh._drawWrappers[passZeroId].materialContext).toBe(passZeroMaterial._materialContext);
        expect(subMesh._drawWrappers[passOneId].materialContext).toBe(passOneSubMaterial._materialContext);

        subMesh.resetDrawCache(passZeroId);

        expect(subMesh._drawWrappers[passZeroId]).toBeUndefined();
        expect(subMesh._drawWrappers[passOneId].materialContext).toBe(passOneSubMaterial._materialContext);
    });
    it("Full Reset", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        subject.currentRenderPassId = passOneId;
        expect(subMesh.getMaterial()).toBe(passOneSubMaterial);
        await passOneMaterial.forceCompilationAsync(mesh);
        expect(passOneMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subMesh._drawWrappers[passZeroId].materialContext).toBe(passZeroMaterial._materialContext);
        expect(subMesh._drawWrappers[passOneId].materialContext).toBe(passOneSubMaterial._materialContext);

        subMesh.resetDrawCache();

        expect(subMesh._drawWrappers[passZeroId]).toBeUndefined();
        expect(subMesh._drawWrappers[passOneId]).toBeUndefined();
    });
    it("Pass Release", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);
        await passZeroMaterial.forceCompilationAsync(mesh);
        expect(passZeroMaterial.isReadyForSubMesh(mesh, subMesh, false)).toBe(true);

        expect(subMesh._drawWrappers[passZeroId].materialContext).toBe(passZeroMaterial._materialContext);

        subject.releaseRenderPassId(passZeroId);

        expect(subMesh._drawWrappers[passZeroId]).toBeUndefined();
    });
    it("Pass Material Unset", async () => {
        subject.currentRenderPassId = passZeroId;
        expect(subMesh.getMaterial()).toBe(passZeroSubMaterial);

        mesh.setMaterialForRenderPass(passZeroId, undefined);

        expect(subMesh.getMaterial(false)).toBeNull();
        expect(subMesh._drawWrappers[passZeroId]).toBeUndefined();
    });
});
