import type {
  Types,
  VolumeViewport,
  VolumeViewport3D,
} from '@cornerstonejs/core';
import {
  cache,
  Enums,
  geometryLoader,
  getRenderingEngine,
  RenderingEngine,
  setVolumesForViewports,
  volumeLoader,
  eventTarget,
  CONSTANTS,
  metaData,
  utilities,
} from '@cornerstonejs/core';

import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  addButtonToToolbar,
  initDemo,
} from '../../../../utils/demo/helpers';
import type { Point3 } from 'core/src/types';
import { createImageIdsAndCacheMetaData2 } from '../../../../utils/demo/helpers/createImageIdsAndCacheMetaData';
import { adjustVolumeDataAfterLoad, adjustVolumeDataAfterLoadForSeries } from './adjustVolumeAfterLoad';
import readDicomRegData from './readDicomRegData';

// This is for debugging purposes
console.debug(
  'Click on index.ts to open source code for this example --------->'
);

const {
  ToolGroupManager,
  Enums: csToolsEnums,
  segmentation,
  ZoomTool,
  PanTool,
  StackScrollTool,
  TrackballRotateTool,
  PlanarFreehandContourSegmentationTool,
  OrientationMarkerTool,
  CrosshairsTool,
} = cornerstoneTools;
const { MouseBindings } = csToolsEnums;
const { ViewportType } = Enums;

// Define a unique id for the volume
const volumeName1 = 'CT_VOLUME_ID1'; // Id of the volume less loader prefix
const volumeName2 = 'CT_VOLUME_ID2'; // Id of the volume less loader prefix

const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use
const volumeId1 = `${volumeLoaderScheme}:${volumeName1}`; // VolumeId with loader id + volume id
const volumeId2 = `${volumeLoaderScheme}:${volumeName2}`; // VolumeId with loader id + volume id
var metadata1, metadata2;
const toolGroupId = 'MY_TOOLGROUP_ID';
const toolGroupId3d = 'MY_3DTOOLGROUP_ID';
const size = '600px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');
var isLoadBothFinished = false;
var registrationMatrix;
// Use CSS grid for 2x2 layout
viewportGrid.style.display = 'grid';
viewportGrid.style.gridTemplateColumns = `${size} ${size}`;
viewportGrid.style.gridTemplateRows = `${size} ${size}`;
viewportGrid.style.gap = '0px'; // No spacing between viewports
viewportGrid.style.width = `calc(2 * ${size})`;
viewportGrid.style.height = `calc(2 * ${size})`;

// Create each viewport element
const element1 = document.createElement('div');
element1.oncontextmenu = () => false;
element1.style.width = size;
element1.style.height = size;
const element2 = document.createElement('div');
element2.oncontextmenu = () => false;
element2.style.width = size;
element2.style.height = size;
const element3 = document.createElement('div');
element3.oncontextmenu = () => false;
element3.style.width = size;
element3.style.height = size;
const element4 = document.createElement('div');
element4.oncontextmenu = () => false;
element4.style.width = size;
element4.style.height = size;
// Add to the grid in order
viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);
viewportGrid.appendChild(element4);

// Add to page
content.appendChild(viewportGrid);
const viewportIds = ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL', 'CT_3D'];

const renderingEngineId = 'myRenderingEngine';
let renderingEngine: RenderingEngine;
let resizeObserver: ResizeObserver;

addButtonToToolbar({
  title: 'Load Study',
  onClick: async () => {
    const renderingEngine = getRenderingEngine(renderingEngineId);
    metadata1 = await createImageIdsAndCacheMetaData2({
      StudyInstanceUID: '1.2.156.112736.1.2.2.1097583607.12296.1695818166.610',
      SeriesInstanceUID:
        '1.2.840.113729.1.4237.9996.2023.9.15.17.48.36.250.10076',
      wadoRsRoot: 'http://localhost:800/dicom-web',
    });
    const imageIds1 = metadata1.imageIds;
    const volume1 = await volumeLoader.createAndCacheVolume(volumeId1, {
      imageIds: imageIds1,
    });
    metadata2 = await createImageIdsAndCacheMetaData2({
      StudyInstanceUID: '1.2.156.112736.1.2.2.1279709348.4668.1704737390.276',
      SeriesInstanceUID: '1.2.156.112736.1.3.2.1279709348.4668.1704737485.281',
      wadoRsRoot: 'http://localhost:800/dicom-web',
    });
    registrationMatrix = await readDicomRegData({
      StudyInstanceUID: '1.2.156.112736.1.2.2.1279709348.4668.1704737390.276',
      SeriesInstanceUID: '1.2.156.112736.1.3.2.1279709348.4668.1704737512.449',
      wadoRsRoot: 'http://localhost:800/dicom-web',
    });
    const imageIds2 = metadata2.imageIds;
    const volume2 = await volumeLoader.createAndCacheVolume(volumeId2, {
      imageIds: imageIds2,
    });
    volume1.load((evt) => {
      handleVolumeLoad(evt);
    });
    volume2.load(async (evt) => {
      handleVolumeLoad(evt);
    });
    await setVolumesForViewports(
      renderingEngine,
      [
        {
          volumeId: volumeId1,
        },
        {
          volumeId: volumeId2,
          blendMode: Enums.BlendModes.AVERAGE_INTENSITY_BLEND,
        },
      ],
      [viewportIds[0], viewportIds[1], viewportIds[2]]
    );
    setViewportColormap([viewportIds[0], viewportIds[1], viewportIds[2]],volumeId2,'Greens', renderingEngineId);

    await setVolumesForViewports(
      renderingEngine,
      [
        {
          volumeId: volumeId1,
        },

      ],
      [viewportIds[3]]
    );
    (
      renderingEngine.getViewport(viewportIds[3]) as VolumeViewport3D
    ).setProperties({
      preset: 'CT-Bone',
    });
    // Render the image
    renderingEngine.render();
  },
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();
  renderingEngine = new RenderingEngine(renderingEngineId);
  resizeObserver = new ResizeObserver(() => {
    renderingEngine = getRenderingEngine(renderingEngineId);
    if (renderingEngine) {
      renderingEngine.resize(true, false);
    }
  });
  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollTool);
  cornerstoneTools.addTool(TrackballRotateTool);
  cornerstoneTools.addTool(PlanarFreehandContourSegmentationTool);
  cornerstoneTools.addTool(OrientationMarkerTool);

  const viewportInputArray = [
    {
      viewportId: viewportIds[0],
      type: ViewportType.ORTHOGRAPHIC,
      element: element1,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: viewportIds[1],
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: viewportIds[2],
      type: ViewportType.ORTHOGRAPHIC,
      element: element3,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: viewportIds[3],
      type: ViewportType.VOLUME_3D,
      element: element4,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
        background: CONSTANTS.BACKGROUND_COLORS.slicer3D as Point3,
      },
    },
  ];
  [element1, element2, element3, element4].forEach((element) => {
    resizeObserver.observe(element);
  });
  renderingEngine.setViewports(viewportInputArray);
  const temp = renderingEngine.getViewport(viewportIds[3]) as VolumeViewport3D;
  segmentation.removeAllSegmentationRepresentations();
  segmentation.state.removeAllSegmentationRepresentations();
  temp.setProperties({
    preset: 'CT-Bone',
  });
  SetToolGroup();
}

run();

function SetToolGroup() {
  // Define tool groups to add the segmentation display tool to
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  const threeDToolGroup = ToolGroupManager.createToolGroup(toolGroupId3d);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);
  toolGroup.addTool(PlanarFreehandContourSegmentationTool.toolName);
  toolGroup.addTool(OrientationMarkerTool.toolName);
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Auxiliary, // Middle Click
      },
    ],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });

  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Wheel,
      },
    ],
  });
  toolGroup.setToolActive(PlanarFreehandContourSegmentationTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Fifth_Button,
      },
    ],
  });

  toolGroup.setToolActive(OrientationMarkerTool.toolName);
  toolGroup.addViewport(viewportIds[0], renderingEngineId);
  toolGroup.addViewport(viewportIds[1], renderingEngineId);
  toolGroup.addViewport(viewportIds[2], renderingEngineId);
  threeDToolGroup.addTool(PanTool.toolName);
  threeDToolGroup.addTool(ZoomTool.toolName);
  threeDToolGroup.addTool(StackScrollTool.toolName);
  // threeDToolGRoup.addTool(SegmentationDisplayTool.toolName);
  threeDToolGroup.addTool(TrackballRotateTool.toolName);

  // threeDToolGRoup.setToolActive(ScaleOverlayTool.toolName);
  threeDToolGroup.setToolActive(TrackballRotateTool.toolName, {
    bindings: [
      {
        mouseButton: csToolsEnums.MouseBindings.Primary,
      },
    ],
  });
  threeDToolGroup.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: csToolsEnums.MouseBindings.Auxiliary, // Middle Click
      },
    ],
  });
  threeDToolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: csToolsEnums.MouseBindings.Secondary, // Right Click
      },
    ],
  });
  threeDToolGroup.setToolEnabled(OrientationMarkerTool.toolName);
  threeDToolGroup.addViewport(viewportIds[3], renderingEngineId);
}
async function handleVolumeLoad(evt: any) {
  if(evt.success && evt.complete){
    if(isLoadBothFinished){
      setTimeout(async ()=>{
        await adjustVolumeDataAfterLoad({
          ctInfo: {
            volumeId: volumeId1,
            gaps: metadata1.gaps,
          },
          ptInfo: {
            volumeId: volumeId2,
            gaps: metadata2.gaps,
            matrix: registrationMatrix,
          },
          renderingEngineId: renderingEngineId,

          fusionViewportIds: [
            viewportIds[0],
            viewportIds[1],
            viewportIds[2],
          ],
          threeDViewportIds: [viewportIds[3]],
          });
        }, 50)

      } else {
        isLoadBothFinished = true;
    }
  }
}

function setViewportColormap(  viewportIds: string[],
  volumeId: string,
  colormapName: string,
  renderingEngineId: string,
  options?: { opacity?: number; voiRange?: Types.VOIRange }) {
  // Get the rendering engine
  const renderingEngine = getRenderingEngine(renderingEngineId);
  const { opacity = 1, voiRange } = options || {};

  viewportIds.forEach((vpId) => {
    const viewport = renderingEngine.getViewport(vpId) as Types.IVolumeViewport;

    // Base properties: colormap + opacity
    const properties: any = {
      colormap: { name: colormapName, opacity },
    };

    // Add voiRange only if provided
    if (voiRange) {
      properties.voiRange = voiRange;
    }

    viewport.setProperties(properties, volumeId);
    viewport.render();
  });
}
