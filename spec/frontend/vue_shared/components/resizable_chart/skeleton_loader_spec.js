import { shallowMount } from '@vue/test-utils';
import ChartSkeletonLoader from '~/vue_shared/components/resizable_chart/skeleton_loader.vue';

describe('Resizable Skeleton Loader', () => {
  let wrapper;

  const createComponent = (propsData = {}) => {
    wrapper = shallowMount(ChartSkeletonLoader, {
      propsData,
    });
  };

  const verifyElementsPresence = () => {
    const gridItems = wrapper.findAll('[data-testid="skeleton-chart-grid"]').wrappers;
    const barItems = wrapper.findAll('[data-testid="skeleton-chart-bar"]').wrappers;
    const labelItems = wrapper.findAll('[data-testid="skeleton-chart-label"]').wrappers;
    expect(gridItems.length).toBe(3);
    expect(barItems.length).toBe(8);
    expect(labelItems.length).toBe(8);
  };

  afterEach(() => {
    if (wrapper?.destroy) {
      wrapper.destroy();
    }
  });

  describe('default setup', () => {
    beforeEach(() => {
      createComponent({ uniqueKey: null });
    });

    it('renders the bars, labels, and grid with correct position, size, and rx percentages', () => {
      expect(wrapper.element).toMatchSnapshot();
    });

    it('renders the correct number of grid items, bars, and labels', () => {
      verifyElementsPresence();
    });
  });

  describe('with custom settings', () => {
    beforeEach(() => {
      createComponent({ uniqueKey: '', rx: 0.6, barWidth: 3, labelWidth: 7, labelHeight: 2 });
    });

    it('renders the correct position, and size percentages for bars and labels with different settings', () => {
      expect(wrapper.element).toMatchSnapshot();
    });

    it('renders the correct number of grid items, bars, and labels', () => {
      verifyElementsPresence();
    });
  });
});
