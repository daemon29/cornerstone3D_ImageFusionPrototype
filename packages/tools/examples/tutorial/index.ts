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

} from '@cornerstonejs/core';

import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  addButtonToToolbar,
  initDemo,
} from '../../../../utils/demo/helpers';
import { createImageIdsAndCacheMetaData2 } from '../../../../utils/demo/helpers/createImageIdsAndCacheMetaData';
import { adjustVolumeDataAfterLoad, adjustVolumeDataAfterLoadForSeries } from './adjustVolumeAfterLoad';
import readDicomRegData from './readDicomRegData';


const {
  ToolGroupManager,
  Enums: csToolsEnums,
  segmentation,
  synchronizers,
  ZoomTool,
  PanTool,
  StackScrollTool,
  TrackballRotateTool,
  PlanarFreehandContourSegmentationTool,
  OrientationMarkerTool,
  CrosshairsTool,
} = cornerstoneTools;
const { createCameraPositionSynchronizer, createVOISynchronizer} =
  synchronizers;
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
var isLoadBothFinished = false;
var registrationMatrix;

const tempViewportIds = ['TEMP_AXIAL', 'TEMP_SAGITTAL', 'TEMP_CORONAL'];
const viewportIds = ['FUSION_AXIAL', 'FUSION_SAGITTAL', 'FUSION_CORONAL'];
createLayout(1920,1080, viewportIds, tempViewportIds);

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
    volume2.load(async (evt) => {
      handleVolumeLoad(evt);
    });
    volume1.load((evt) => {
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
    await setVolumesForViewports(
      renderingEngine,
      [
        {
          volumeId: volumeId2,
        },
      ],
      [tempViewportIds[0], tempViewportIds[1], tempViewportIds[2]]
    );
    setViewportColormap([tempViewportIds[0], tempViewportIds[1], tempViewportIds[2]],volumeId2,'Greens', renderingEngineId);
    setViewportColormap([viewportIds[0], viewportIds[1], viewportIds[2]],volumeId2,'Greens', renderingEngineId);
    // Render the image
    renderingEngine.render();
    InitializeCameraSync(renderingEngine, viewportIds, tempViewportIds);
    SetUpSynchronizers(viewportIds, tempViewportIds);
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
      element: document.getElementById(viewportIds[0]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
      },
    },
    {
      viewportId: viewportIds[1],
      type: ViewportType.ORTHOGRAPHIC,
      element: document.getElementById(viewportIds[1]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
      },
    },
    {
      viewportId: viewportIds[2],
      type: ViewportType.ORTHOGRAPHIC,
      element: document.getElementById(viewportIds[2]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
      },
    },
        {
      viewportId: tempViewportIds[0],
      type: ViewportType.ORTHOGRAPHIC,
      element: document.getElementById(tempViewportIds[0]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
      },
    },
    {
      viewportId: tempViewportIds[1],
      type: ViewportType.ORTHOGRAPHIC,
      element: document.getElementById(tempViewportIds[1]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
      },
    },
    {
      viewportId: tempViewportIds[2],
      type: ViewportType.ORTHOGRAPHIC,
      element: document.getElementById(tempViewportIds[2]),
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
      },
    },
  ];
  [document.getElementById(viewportIds[0]), document.getElementById(viewportIds[1]), document.getElementById(viewportIds[2])].forEach((element) => {
    resizeObserver.observe(element);
  });
  renderingEngine.setViewports(viewportInputArray);
  SetToolGroup();
}

run();

function SetToolGroup() {
  // Define tool groups to add the segmentation display tool to
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);
  toolGroup.addTool(OrientationMarkerTool.toolName);
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Primary, // Middle Click
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

  toolGroup.setToolActive(OrientationMarkerTool.toolName);
  toolGroup.addViewport(viewportIds[0], renderingEngineId);
  toolGroup.addViewport(viewportIds[1], renderingEngineId);
  toolGroup.addViewport(viewportIds[2], renderingEngineId);
  // const tempToolGroup = ToolGroupManager.createToolGroup('temp');
  // tempToolGroup.addTool(StackScrollTool.toolName);
  // // tempToolGroup.addTool(PanTool.toolName);
  // // tempToolGroup.addTool(ZoomTool.toolName);
  // tempToolGroup.setToolActive(StackScrollTool.toolName, {
  //   bindings: [
  //     {
  //       mouseButton: MouseBindings.Wheel,
  //     },
  //   ],
  // });
  // tempToolGroup.addViewport(tempViewportIds[0], renderingEngineId);
  // tempToolGroup.addViewport(tempViewportIds[1], renderingEngineId);
  // tempToolGroup.addViewport(tempViewportIds[2], renderingEngineId);
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
          tempViewportIds: tempViewportIds,
          fusionViewportIds: [
            viewportIds[0],
            viewportIds[1],
            viewportIds[2],
          ],
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

function createLayout(totalWidth, totalHeight, mainViewportId, tempViewportId) {
  const content = document.getElementById('content');

  const viewportGrid = document.createElement('div');
  viewportGrid.style.display = 'grid';
  viewportGrid.style.width = totalWidth + 'px';
  viewportGrid.style.height = totalHeight + 'px';

  viewportGrid.style.gridTemplateColumns = '2fr 1fr';
  viewportGrid.style.gridTemplateRows = '1fr 1fr';

  // ---------- helper ----------
  function createStack(mainId, tempId) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    const temp = document.createElement('div');
    temp.id = tempId;
    temp.style.position = 'absolute';
    temp.style.inset = '0';
    temp.style.zIndex = '1';
    temp.style.pointerEvents = 'none';
    temp.oncontextmenu = () => false;

    const main = document.createElement('div');
    main.id = mainId;
    main.style.position = 'absolute';
    main.style.inset = '0';
    main.style.zIndex = '2';
    main.oncontextmenu = () => false;

    container.appendChild(temp); // bottom first
    container.appendChild(main); // top

    return container;
  }

  // ---------- create 3 stacked cells ----------
  const left = createStack(mainViewportId[0], tempViewportId[0]);
  left.style.gridRow = '1 / span 2';

  const topRight = createStack(mainViewportId[1], tempViewportId[1]);
  const bottomRight = createStack(mainViewportId[2], tempViewportId[2]);

  viewportGrid.appendChild(left);
  viewportGrid.appendChild(topRight);
  viewportGrid.appendChild(bottomRight);

  content.appendChild(viewportGrid);
}

function SetUpSynchronizers(viewportIds, tempViewportIds){
  var axialCameraPositionSynchronizer = createCameraPositionSynchronizer(
    "AXIAL_CAMERA_SYNC"
  );
  var sagittalCameraPositionSynchronizer = createCameraPositionSynchronizer(
    "SAGITTAL_CAMERA_SYNC"
  );
  var coronalCameraPositionSynchronizer = createCameraPositionSynchronizer(
    "CORONAL_CAMERA_SYNC"
  );
  [viewportIds[0],tempViewportIds[0]].forEach((viewportId) => {
    axialCameraPositionSynchronizer.add({
      renderingEngineId,
      viewportId,
    });
  });
  [viewportIds[1],tempViewportIds[1]].forEach((viewportId) => {
    sagittalCameraPositionSynchronizer.add({
      renderingEngineId,
      viewportId,
    });
  });
  [viewportIds[2],tempViewportIds[2]].forEach((viewportId) => {
    coronalCameraPositionSynchronizer.add({
      renderingEngineId,
      viewportId,
    });
  });
}

function InitializeCameraSync(renderingEngine, mainViewportIds, tempViewportIds){
  var mainAxial = renderingEngine.getViewport(mainViewportIds[0]);
  var mainSagittal = renderingEngine.getViewport(mainViewportIds[1]);
  var mainCoronal = renderingEngine.getViewport(mainViewportIds[2]);
  var tempAxial = renderingEngine.getViewport(tempViewportIds[0]);
  var tempSagittal = renderingEngine.getViewport(tempViewportIds[1]);
  var tempCoronal = renderingEngine.getViewport(tempViewportIds[2]);
  initCameraSynchronization(mainAxial, tempAxial);
  initCameraSynchronization(mainSagittal, tempSagittal);
  initCameraSynchronization(mainCoronal, tempCoronal);
  renderingEngine.render();
}
function initCameraSynchronization(sViewport, tViewport) {
  // Initialise the sync as they viewports will have
  // Different initial zoom levels for viewports of different sizes.

  const camera = sViewport.getCamera();

  tViewport.setCamera(camera);
}
