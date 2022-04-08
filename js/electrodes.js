// This file contains functions for formatting json data and displaying graphical
// representations. can possibly revise if we do not want to keep it in that format,
// and just use indices directly

import { mapInterval } from "./mapInterval.js";
import { getSeizTypeColor } from "./color.js";
import { DOMNodes } from "./DOMtree.js";
import { GFX } from "./gfx.js";

// be mindful that NONE occupies index 0
const getCurrentSelectedIndex = () => {
  const { electrodeMenu } = DOMNodes;
  return electrodeMenu.selectedIndex;
};

const updateSliceLocation = (sliderControllers, volume, electrode) => {
  const numSlices = volume.dimensions[0];
  const startRange = [-numSlices / 2, numSlices / 2];
  const endRange = [0, numSlices - 1];
  const { x, y, z } = electrode.coordinates;

  const [xSlice, ySlice, zSlice] = [x, y, z].map((coordinate) =>
    Math.round(mapInterval(coordinate, startRange, endRange))
  );

  const xSlider = sliderControllers.find(
    (controller) => controller.property === "indexX"
  );
  const ySlider = sliderControllers.find(
    (controller) => controller.property === "indexY"
  );
  const zSlider = sliderControllers.find(
    (controller) => controller.property === "indexZ"
  );

  // move to the index property that matches with the slice number of the electrode
  volume.visible = !volume.visible;
  xSlider.object.indexX = xSlice;
  ySlider.object.indexY = ySlice;
  zSlider.object.indexZ = zSlice;
  volume.visible = !volume.visible;
};

// function for adding options based on electrode IDs and jumping slices when one is
// selected
// TODO: SPLIT INTO TWO FUNCTIONS AT LEAST
/**
 *
 * @param {array} elObjects
 * @param {array} idArray
 * @param {array} selectionSpheres
 * @param {JSON} data
 * @param {X.volume} volume
 */
const initializeElectrodeIDMenu = (
  data,
  selectionSpheres,
  volumeGUI,
  volume
) => {
  const { electrodeMenu } = DOMNodes;

  electrodeMenu.addEventListener("change", (event) => {
    const id = event.target.value;
    const index = data.electrodes.findIndex((e) => e.elecID === id);
    const res = data.electrodes.find((e) => e.elecID === id);

    console.log(res, index);
    printElectrodeInfo(res, index, selectionSpheres, data);
    if (id !== "None" && res)
      updateSliceLocation(volumeGUI.__controllers, volume, res);
  });
  // append HTML option to drop down menu
  for (const entry of data.electrodes) {
    const newOption = document.createElement("option");
    newOption.value = entry.elecID;
    newOption.innerText = entry.elecID;
    electrodeMenu.appendChild(newOption);
  }
};

/**
 *
 * @param {JSON} data
 * @param {array} spheres
 * @param {array} fmaps
 */
const initSeizureTypeMenu = (data, spheres, fmaps) => {
  const seizureTypes = data.SeizDisplay;
  const { seizTypeMenu } = DOMNodes;

  // make ALL fmaps visible if user selects "Fun Mapping"
  seizTypeMenu.addEventListener("change", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedType = event.target.value;

    if (selectedType === "funMapping") {
      fmaps.forEach((fmap) => (fmap.visible = true));
    }

    const selectedSeizType = getAttributeArray(data.electrodes, selectedType);
    spheres.forEach((sphere, index) => {
      sphere.color = getSeizTypeColor(selectedSeizType[index]);
    });
  });

  // create the menu options for all of patients seizure types
  seizureTypes.forEach((type) => {
    const newOption = document.createElement("option");
    newOption.value = type;
    newOption.innerText = type;
    seizTypeMenu.appendChild(newOption);
  });
};

/**
 *
 * @param {array} data - electrode data
 * @param {array} connections - the X.cyilinders
 * @param {array} fmapHighlights - the X.cylinders which highlight
 */
const addEventsToFmapMenu = (data, connections, fmapHighlights) => {
  const { fmapMenu, fmapCaption } = DOMNodes;
  fmapMenu.addEventListener("change", (event) => {
    const selected = getAttributeArray(data.functionalMaps, event.target.value);
    if (selected !== "None") {
      GFX.redrawFmaps(connections, selected);
      fmapCaption.innerText = "No Functional Mapping Selected";
    } else {
      fmaps.forEach((fmap) => (fmap.visible = false));
    }
    fmapHighlights.forEach((fmap) => (fmap.visible = false));
  });
};

// find the electrode in the options and display the info on the panel
/**
 *
 *  @param {object} selectedElectrode
 * @param {number} index - index in the data
 * @param {array} selectionSpheres - opaque blue spheres that surround an electrode
 * @param {JSON} data
 */
const printElectrodeInfo = (
  selectedElectrode,
  index,
  selectionSpheres,
  data
) => {
  if (selectedElectrode) {
    updateLabels(selectedElectrode, index, data);
    GFX.highlightSelectedElectrode(selectionSpheres, index);
  } else {
    console.log(`Could not find electrode with ID of ${ID}`);
  }
};

// changes the mosue to a crosshair for responsive selection
const addMouseHover = (renderer) => {
  renderer.interactor.onMouseMove = (e) => {
    let hoverObject = renderer.pick(e.clientX, e.clientY);
    if (hoverObject !== 0) {
      let selectedSphere = renderer.get(hoverObject);
      if (selectedSphere.g === "sphere" || selectedSphere.g === "cylinder") {
        document.body.style.cursor = "crosshair";
      } else {
        selectedSphere.visible = true;
        selectedSphere = null;
        hoverObject = 0;
      }
    } else {
      document.body.style.cursor = "auto";
    }
  };
};
/**
 *
 * @param {object} electrode - the selected electrode object
 * @param {number} index
 * @param {JSON} data - the JSON
 *
 * It might be a bit foolish to have the data in two different formats like this. It would
 * be better if we could have it all as one form, but there are times when having the ready
 * made arrays from the JSON is very useful
 */

const updateLabels = (electrode, index, data) => {
  const { elecID, elecType, intPopulation, coordinates } = electrode;
  const { x, y, z } = coordinates;

  const {
    seizTypeMenu,
    intPopulationLabel,
    seizTypeLabel,
    IDLabel,
    elecTypeLabel,
    coordinateLabel,
  } = DOMNodes;

  const selectedSeizType = seizTypeMenu.selectedOptions[0].value;
  const seizureTypeValues = getAttributeArray(
    data.electrodes,
    selectedSeizType
  );

  IDLabel.innerText = elecID;
  elecTypeLabel.innerText = elecType;
  coordinateLabel.innerText = `(${Math.round(x)}, ${Math.round(
    y
  )}, ${Math.round(z)})`;

  if (selectedSeizType === "intPopulation") {
    intPopulationLabel.innerText = intPopulation;
    seizTypeLabel.innerText = "";
  } else {
    const currentElecSeizType = seizureTypeValues[index];
    seizTypeLabel.innerText = currentElecSeizType;
    intPopulationLabel.innerText = "";
  }
};

/**
 *
 * @param {JSON} data               - Original JSON data
 * @param {X.renderer3D} renderer   - The main renderer
 * @param {object} datGUI           - GUI controller
 * @param {array} spheres           - Array of X.spheres that represent electrodes
 * @param {array} selections        - Opaque blue spheres that highlight an electrode
 * @param {array} fmaps             - Array of X.cylinders
 * @param {array} fmapHighlights    - Opaque blue cyilnders that surround fmaps
 * @param {X.volume} volumeRendered - The volume displayed on slices
 *
 * This function is responsible for way too much. Would be good to find a way to break
 * it down into more reasonable components. It adds an event listener to the canvas,
 * does object picking, highlights an electrode, jumps the slices, and displays
 * captions on the panel
 */

const jumpSlicesOnClick = (
  data,
  renderer,
  datGUI,
  spheres,
  selections,
  fmapConnections,
  fmapHighlights,
  volumeRendered
) => {
  // get the main canvas
  const { canvases, electrodeMenu, fmapCaption } = DOMNodes;
  canvases[0].addEventListener("click", (e) => {
    const clickedObject = renderer.pick(e.clientX, e.clientY);
    // check if it actually has an ID
    if (clickedObject !== 0) {
      const selectedObject = renderer.get(clickedObject);
      // ".g" is an object property that corresponds to the selected X.object's name
      if (selectedObject.g === "sphere") {
        // find the actual electrode in the array of XTK spheres
        const sphereIndex = spheres.indexOf(selectedObject);

        if (sphereIndex >= 0) {
          const target = data.electrodes[sphereIndex];

          // highlight and show the needed captions on the menu
          GFX.highlightSelectedElectrode(selections, sphereIndex);
          updateLabels(target, sphereIndex, data);

          // sync with electrode menu options
          const electrodeIDMenuOptions = electrodeMenu.options;
          electrodeIDMenuOptions.selectedIndex = sphereIndex + 1;

          updateSliceLocation(datGUI.__controllers, volumeRendered, target);
        }
      } else if (selectedObject.g === "cylinder") {
        const cylinderIndex = fmapConnections.indexOf(selectedObject);
        if (cylinderIndex >= 0) {
          fmapCaption.innerText = selectedObject.caption;
          GFX.highlightSelectedFmap(fmapHighlights, cylinderIndex);
        }
      }
    }
  }); // end of event lsitener
};

const getAttributeArray = (data, attr) => {
  return data.map((datum) => datum[attr]);
};

const loadElectrodes = (
  renderer,
  volumeGUI,
  volume,
  mode,
  subject,
  playSignalController
) => {
  (async () => {
    // initial data load
    const data =
      mode === "umb"
        ? await (await fetch(`./data/${subject}/JSON/${subject}.json`)).json()
        : await (
            await fetch(
              `${window.location.protocol}//ievappwpdcpvm01.nyumc.org/?file=${subject}.json`
            )
          ).json();

    // this is a work-around from a glitch with the "show all tags" button. we have to offset each coordinate
    // by the bounding box, then reset it. hopefully this can be fixed one day
    const oldBoundingBox = renderer.u;
    const defaultSeizType = getAttributeArray(data.electrodes, data.SeizDisplay[0])
    const { subjectIDLabel, numSeizTypeLabel, tagsBtn, editBtn } = DOMNodes;

    subjectIDLabel.innerText = data.subjID;
    numSeizTypeLabel.innerText = data.totalSeizType;

    // arrays of objects
    const electrodeSpheres = data.electrodes.map((el, index) =>
      GFX.drawElectrodeFx(el, false, defaultSeizType[index], oldBoundingBox)
    );
    const selectionSpheres = data.electrodes.map((el, index) =>
      GFX.drawElectrodeFx(el, true, defaultSeizType[index], oldBoundingBox)
    );
    const fmapConnections = GFX.drawFmapFx(
      data.functionalMaps,
      data.electrodes
    );
    const fmapHighlights = fmapConnections.map((fmap) =>
      GFX.drawFmapHighlightFx(fmap)
    );

    // add XTK's graphical representation of data to renderer
    electrodeSpheres.forEach((el) => renderer.add(el));
    selectionSpheres.forEach((el) => renderer.add(el));
    fmapConnections.forEach((connection) => renderer.add(connection));
    fmapHighlights.forEach((highlight) => renderer.add(highlight));

    //setup electrode signal display
    let playSignal = false;

    playSignalController["start / stop"] = function (){
      let signalFrequency = 250;

      playSignal = !playSignal;

      function applySignal() {
        if (!playSignal) return;

        electrodeSpheres.forEach(sphere => sphere.color = [Math.random(), Math.random(), Math.random()]);

        setTimeout(applySignal, signalFrequency);
      }

      if (playSignal) 
        applySignal();
    };

    // //* adds the seizure types to the first drop down menu on the panel
    initSeizureTypeMenu(data, electrodeSpheres, fmapConnections);

    // //* adds the IDs to the elctrode ID menu and sets up event listeners
    initializeElectrodeIDMenu(data, selectionSpheres, volumeGUI, volume);

    // //* this needs to be refactored
    jumpSlicesOnClick(
      data,
      renderer,
      volumeGUI,
      electrodeSpheres,
      selectionSpheres,
      fmapConnections,
      fmapHighlights,
      volume
    );

    // adds functionality for hovering over particular electrodes on the scene
    addMouseHover(renderer);

    // //* adds the event listners to the functional map menu
    addEventsToFmapMenu(data, fmapConnections, fmapHighlights);

    // create an array of sphere IDs (internal to XTK) for the "show all tags" button
    const sphereIDs = electrodeSpheres.map((el) => el.id);

    // adds event listener to the show-all-tags button on the menu
    tagsBtn.addEventListener("click", () => {
      renderer.resetBoundingBox();
      renderer.showAllCaptions(sphereIDs);
    });

    // right now, just turns electrodes to "onset" type
    editBtn.addEventListener("click", () => {
      const currentIndex = getCurrentSelectedIndex() - 1;
      if (currentIndex < 0) return;

      const currentElectrode = data.electrodes[currentIndex];

      const updatedElectrode = {
        ...currentElectrode,
        seizType: "Onset",
      };

      data.electrodes[currentIndex] = updatedElectrode;

      // since this logic is repeated elsewhere, it would be good to abstract
      // to its own function
      electrodeSpheres.forEach((sphere, index) => {
        sphere.color = getSeizTypeColor(data.electrodes[index].seizType);
      });
    });
  })();
};

export { loadElectrodes };
