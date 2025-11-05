import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import "./ShapeSnap.css";

export default function ShapeSnap() {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: "/Unity/ShapeSnap3D/Build/ShapeSnap3D.loader.js",
    dataUrl: "/Unity/ShapeSnap3D/Build/ShapeSnap3D.data",
    frameworkUrl: "/Unity/ShapeSnap3D/Build/ShapeSnap3D.framework.js",
    codeUrl: "/Unity/ShapeSnap3D/Build/ShapeSnap3D.wasm",
  });

  const percent = Math.round((loadingProgression ?? 0) * 100);

  return (
    <div className="shapesnap-root">
      {!isLoaded && (
        <div className="shapesnap-loading">
          <div className="shapesnap-loading__label">Loading Shape Snap…</div>
          <div className="shapesnap-progress" aria-label="Loading progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div
              className="shapesnap-progress__fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="shapesnap-percent">{percent}%</div>
          <div className="shapesnap-dot" aria-hidden="true" />
        </div>
      )}

      <Unity
        unityProvider={unityProvider}
        className={!isLoaded ? "shapesnap-canvas--hidden" : undefined}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
