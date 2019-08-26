# Intro

A D3-based chart that is highly configurable at runtime.

## Usage

### Binding data for the line chart:
 - **Data**: the data used for drawing the line chart, which can be bound to an infotable. There is no particular requirement for this infotable, other than having a time field for the X axis and one or more value fileds for the Y axis.
 - **XField**: the infotable field that represents the time.
 - **YFields**: a serialized JSON array string which specifies which value fields to use for the line graph. This property is bindable and you can change the number of lines at runtime. For example, for an infotable with the columns `timestamp`, `temperature`, `current`, `speed`, `rpm`, the *YFields* could be:
    - [“temperature”, “current”, “speed”, “rpm”] to show all 4 fields on the graph
    - [“speed”, “rpm”] to show just the speed and rpm fields
 - **YFieldColors** a JSON array that specifies what color each line should be. If you leave it blank, the widget provides default colors for up to 12 lines. The order of the colors should match the order of the fields; for example:
    - [“#F00”, “#00F”, “#0F0”, “#0080CC”] would color the temperature line with red, the current with blue, the speed with green and the rpm with teal
 - **StrokeWidths** a JSON array that specifies the stroke widths for each line. If left blank, the widget uses a stroke width of 2 for all the lines.
 - **Patterns**: Optional. A JSON array of strings that specifies the dash patterns for each line. If left blank, the widget uses no dash patterns for any line. The strings must be svg stroke-dasharray strings.
 - **DisplayConfiguration**: Optional. If it is not set, all fields will use the global chart properties such as Fill and FillOpacity. A JSON array of objects that controls various drawing properties for each field. These can have any of the following fields:
    - `line` <Boolean>                          Defaults to false. If set to true, the chart will draw a line for this field.
    - `fill` <Boolean>                          Defaults to false. If set to true, the chart will draw a fill for this field.
    - `fillOpacity` <Number>                    Defaults to the global fill opacity. Must be used with fill. Controls the opacity of the fill for this field.
    - `dataPoint` <Boolean>                     Defaults to false. If set to true, the chart will draw data points for this field.
    - `dataPointStyle` <String>                 Defaults to “fill”. Must be one of “fill” or “stroke”. Controls how the data points will appear for this field.
    - `dataPointSize` <Number>                  Defaults to the global data point size. The size of the data points for this field.
    - `dataPointShape` <String>                 Defaults to “circle”. Must be one of “circle”, “cross”, “diamond”, “square”, “triangle-down” or “triangle-up”. The type of symbol to use for the data point.
 
 - **Interpolation**: a bindable property that controls how the graph will interpolate its values. It can be bound, for example, to a list that has the interpolation options. Note that non-linear interpolations might slow runtime performance as the chart has to compute the new values, which usually no longer match the actual data.

### Thresholds

You can specify fixed horizontal lines in a JSON string by setting and optionally binding the Thresholds property. The property takes a JSON array string like this:

```json
[
    {
        threshold: 33, // The threshold is the line’s value
        color: 'blue', // The color to use when drawing; this can be any CSS color such as #FF0000 or rgb(255, 0, 0)
        thickness: 1, // How thick the line should be
        label: 'Blue Threshold' // The label to use on the legend and when hovering
    }, {
        threshold: 5,
        color: 'red',
        thickness: 3,
        label: 'Red Threshold',
        pattern: '5, 5, 10, 10' // An optional dash pattern
    }
]
```
 
### Secondary chart

The D3 Range Chart also supports drawing a secondary chart below the main time-series chart. This chart can either be a **state timeline** or a **bar chart**. To enable the secondary chart choose the `SecondaryChartType` property and bind an infotable to the relevant data property: `TimelineData` for a timeline or `BarChartData` for a bar chart.

#### Binding data for the timeline:
 - **SecondaryChartType**: must be set to **timeline**.
 - **TimelineData**: the data used for drawing the timeline, which can be bound to an infotable. There is no particular requirement for this infotable, other than having a time field for the X axis and a field which represents the state between that time and the next entry. This infotable must be sorted by the timestamp ascending.
 - **TimelineXField** the infotable field that represents the time.
 - **TimelineStateField**: the infotable field that represents the state.
 - **TimelineColorMap**: an optional JSON object string that specifies the colors by state. E.g.:
    - `{“Open”: “red”, “Closed”: “blue”}` would draw the Open state with red and the Closed state with blue


#### Binding data for the bar chart
 - **SecondaryChartType**: must be set to **bar chart**.
 - The other bar chart fields are all very similar to the main time series chart. There are properties like **BarChartXField**, **BarChartYFields**, **BarChartColors** etc that all work the same as the time series properties explained above.

## Developing

### Required software

The following software is required:

* [NodeJS](https://nodejs.org/en/) needs to be installed and added to the `PATH`. You should use the LTS version.

The following software is recommended:

* [Visual Studio Code](https://code.visualstudio.com/): An integrated developer enviroment with great typescript support. You can also use any IDE of your liking, it just that most of the testing was done using VSCode.

### Proposed folder structure

```
demoWebpackTypescriptWidget
│   README.md         // this file
│   package.json      // here you specify project name, homepage and dependencies. This is the only file you should edit to start a new project
│   tsconfig.json     // configuration for the typescript compiler
│   webpack.config.js // configuration for webpack
│   metadata.xml      // thingworx metadata file for this widget. This is automatically generated based on your package.json
│   index.html        // when testing the widget outside of thingworx, the index file used.
└───src               // main folder where your developement will take place
│   │   index.ts               // source file used when testing the widget outside of twx
│   │   demoWebpack.ide.ts     // source file for the Composer section of the widget
│   │   demoWebpack.runtime.ts // source file for the Runtime section of the widget
│   └───internalLogic          // usually, put the enternal logic into a separate namespace
│   │   │   file1.ts           // typescript file with internal logic
│   │   │   file2.js           // javascript file in ES2015 with module
│   │   │   ...
│   └───styles        // folder for css styles that you can import into your app using require statements
│   └───images        // folder for image resources you are statically including using require statements
│   └───static        // folder for resources that are copied over to the development extension. Think of folder of images that you referece only dynamicaly
└───build         // temporary folder used during compilation
└───zip               // location of the built extension
```

### Developing

In order to start developing you need to do the following:

1. Clone this repository
    ```
    git clone http://roicentersvn.ptcnet.ptc.com/placatus/DemoWebpackWidget.git
    ```
2. Open `package.json` and configure the `name`, `description`, and other fields you find relevant
3. Run `npm install`. This will install the development dependencies for this project.
4. Run `npm run init`. This will create sample runtime and ide typescript files using the name.
5. Start working on your widget.

### Building and publishing

The following commands allow you to build and compile your widget:

* `npm run build`: builds the production version of the widget. Creates a new extension zip file under the `zip` folder. The production version is optimized for sharing and using in production enviroments.
* `npm run upload`: creates a build, and uploads the extension zip to the thingworx server configured in `package.json`. The build is created for developement, with source-maps enabled.
* `npm run watch`: watches the source files, and whenever they change, do a build.