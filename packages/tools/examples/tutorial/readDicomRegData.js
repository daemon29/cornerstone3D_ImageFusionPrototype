// -----------------------------------------------------------------------------
// Component            : PumaRV
//
// Source file          : readDicomRegData.js
//
// Author               : Tuan Nguyen
//
// Creation Date        : January  10, 2025
//
// Description          : Read Dicom Reg Data
//
// Copyright (C) 2025 Prowess, Inc. All Rights Reserved
// The copyright to the computer program(s) herein is the property
// of Prowess, Inc. The program(s) may be used and/or copied only
// with the written permission of Prowess, Inc. or in accordance
// with the terms and conditions stipulated in the agreement/contract
// under which the program(s) have been supplied.
// -----------------------------------------------------------------------------

import { api } from "dicomweb-client";
import dcmjs from "dcmjs";
const { DicomMetaDictionary } = dcmjs.data;
import { mat4, vec3, quat } from "gl-matrix";

export default async function readDicomRegData({
  StudyInstanceUID,
  SeriesInstanceUID,
  wadoRsRoot,
  client = null,
}) {
  const studySearchOptions = {
    studyInstanceUID: StudyInstanceUID,
    seriesInstanceUID: SeriesInstanceUID,
  };
  const MODALITY = "00080060";
  const REGISTRATION_SEQUENCE = "00700308";
  const MATRIX_REGISTRATION_SEQUENCE = "00700309";
  const MATRIX_SEQUENCE = "0070030A";
  const MATRIXUID = "300600C6";
  const PRIVATE_TRANSLATION_SEQUENCE = "00711010";
  const PRIVATE_ROTATION_SEQUENCE = "00711020";

  client = client ||
    new api.DICOMwebClient({
      url: wadoRsRoot,
    });
  let instances = await client.retrieveSeriesMetadata(studySearchOptions);
  const modality = instances[0][MODALITY].Value[0];
  if (modality == "REG") {
    var matrix =
      instances[0][REGISTRATION_SEQUENCE].Value[0][MATRIX_REGISTRATION_SEQUENCE]
        .Value[0][MATRIX_SEQUENCE].Value[0][MATRIXUID].Value;
    return mat4.fromValues(...matrix);
  }
  return mat4.create();
}
